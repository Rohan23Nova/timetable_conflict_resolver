"""Service layer for CSV data import parsing, row-level validation, atomic transactions, and template generation."""

import csv
import io
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Set, Tuple
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from backend.app.models.enrolment import EnrolmentModel
from backend.app.models.examination import ExamModel
from backend.app.models.schedule import SavedSchedule
from backend.app.models.student import StudentModel
from backend.app.schemas.imports import (
    ImportCommitRequest,
    ImportCommitResponse,
    ImportPreviewResponse,
    ImportRowValidation,
    ImportType,
)
from backend.app.services.graph_service import GraphService

# Operational Limits
MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024  # 5 Megabytes
MAX_ROW_COUNT = 5000  # 5,000 rows

# Header specifications per dataset type
REQUIRED_HEADERS: Dict[str, List[str]] = {
    "exams": ["exam_code", "subject_name"],
    "students": ["student_id"],
    "enrolments": ["student_id", "exam_code"],
}

OPTIONAL_HEADERS: Dict[str, List[str]] = {
    "exams": ["department", "semester", "duration"],
    "students": ["student_name", "display_name"],
    "enrolments": [],
}


class ImportService:
    """Manages CSV file parsing, strict validation, preview caching, and transactional database commits."""

    # In-memory store for validated previews: preview_id -> preview_dict
    _preview_cache: Dict[str, Dict[str, Any]] = {}

    @classmethod
    def parse_and_validate_csv(
        cls,
        db: Session,
        import_type: ImportType,
        file_bytes: bytes,
        filename: str = "import.csv",
    ) -> ImportPreviewResponse:
        """Parse raw CSV file bytes, enforce limits, validate columns and rows against database constraints."""
        # 1. Enforce file size limit
        if len(file_bytes) > MAX_FILE_SIZE_BYTES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File size exceeds the 5MB limit ({len(file_bytes)} bytes uploaded). Please upload a smaller file.",
            )

        if len(file_bytes) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Uploaded CSV file is completely empty. Please supply a valid CSV file.",
            )

        # 2. Decode text (support UTF-8, UTF-8 with BOM, and ASCII fallback)
        try:
            content = file_bytes.decode("utf-8-sig")
        except UnicodeDecodeError:
            try:
                content = file_bytes.decode("latin-1")
            except Exception:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid text encoding. CSV files must be encoded in standard UTF-8 or ASCII.",
                )

        if not content.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Uploaded CSV file contains only blank whitespace. Please supply valid records.",
            )

        # 3. Parse CSV rows
        try:
            reader = csv.reader(io.StringIO(content))
            raw_rows = list(reader)
        except csv.Error as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Malformed CSV formatting: {str(e)}",
            )

        if not raw_rows:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No CSV rows detected. Ensure the file has a header and data rows.",
            )

        # 4. Validate header row
        header_raw = raw_rows[0]
        column_headers = [col.strip().lower() for col in header_raw if col.strip()]

        if not column_headers:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Header row is empty or contains no valid column names.",
            )

        required_cols = REQUIRED_HEADERS.get(import_type, [])
        missing_required = [col for col in required_cols if col not in column_headers]

        data_rows = raw_rows[1:]

        # Filter out empty blank lines
        data_rows = [row for row in data_rows if any(cell.strip() for cell in row)]

        total_rows = len(data_rows)
        if total_rows > MAX_ROW_COUNT:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File contains {total_rows} rows, exceeding the limit of {MAX_ROW_COUNT} rows per batch.",
            )

        # If required headers are completely missing, return fatal preview without proceeding to row validation
        if missing_required:
            preview_id = uuid.uuid4().hex
            resp = ImportPreviewResponse(
                preview_id=preview_id,
                import_type=import_type,
                filename=filename,
                total_rows=total_rows,
                valid_rows=0,
                invalid_rows=total_rows,
                warning_rows=0,
                can_commit_atomic=False,
                can_commit_valid_only=False,
                column_headers=column_headers,
                missing_required_headers=missing_required,
                rows=[],
                summary=(
                    f"Fatal Header Error: Missing required column(s): {', '.join(missing_required)}. "
                    f"Expected headers for '{import_type}': {', '.join(required_cols)}."
                ),
            )
            return resp

        # 5. Fetch existing database records for referential integrity and duplicate checks
        existing_exam_codes: Set[str] = {
            code for (code,) in db.query(ExamModel.code).all()
        }
        existing_student_ids: Set[str] = {
            s_id for (s_id,) in db.query(StudentModel.student_id).all()
        }

        existing_enrolment_pairs: Set[Tuple[str, str]] = set()
        if import_type == "enrolments":
            for enrolment in db.query(EnrolmentModel).all():
                if enrolment.student and enrolment.exam:
                    existing_enrolment_pairs.add(
                        (enrolment.student.student_id, enrolment.exam.code)
                    )

        # 6. Row-by-row validation loop
        validated_rows: List[ImportRowValidation] = []
        seen_in_batch: Set[Any] = set()

        valid_count = 0
        invalid_count = 0
        warning_count = 0

        header_indices = {name: idx for idx, name in enumerate(column_headers)}

        for idx, row in enumerate(data_rows):
            row_num = idx + 2  # CSV line number (line 1 is header)
            row_errors: List[str] = []
            row_warnings: List[str] = []

            # Map cell values to normalized header names
            row_data: Dict[str, Any] = {}
            for col_name, col_idx in header_indices.items():
                val = row[col_idx].strip() if col_idx < len(row) else ""
                row_data[col_name] = val

            # Validation specific to dataset type
            if import_type == "exams":
                cls._validate_exam_row(
                    row_data,
                    row_num,
                    row_errors,
                    row_warnings,
                    seen_in_batch,
                    existing_exam_codes,
                )
            elif import_type == "students":
                cls._validate_student_row(
                    row_data,
                    row_num,
                    row_errors,
                    row_warnings,
                    seen_in_batch,
                    existing_student_ids,
                )
            elif import_type == "enrolments":
                cls._validate_enrolment_row(
                    row_data,
                    row_num,
                    row_errors,
                    row_warnings,
                    seen_in_batch,
                    existing_enrolment_pairs,
                    existing_student_ids,
                    existing_exam_codes,
                )

            # Determine row status
            if row_errors:
                row_status = "error"
                invalid_count += 1
            elif row_warnings:
                row_status = "warning"
                warning_count += 1
                valid_count += 1
            else:
                row_status = "valid"
                valid_count += 1

            validated_rows.append(
                ImportRowValidation(
                    row_number=row_num,
                    data=row_data,
                    status=row_status,
                    errors=row_errors,
                    warnings=row_warnings,
                )
            )

        preview_id = uuid.uuid4().hex

        # Cache preview result for commit step
        cls._preview_cache[preview_id] = {
            "import_type": import_type,
            "filename": filename,
            "column_headers": column_headers,
            "rows": validated_rows,
            "valid_rows": valid_count,
            "invalid_rows": invalid_count,
            "created_at": datetime.now(timezone.utc),
        }

        summary = (
            f"Parsed {total_rows} rows: {valid_count} valid, {invalid_count} with errors, "
            f"{warning_count} with warnings."
        )

        return ImportPreviewResponse(
            preview_id=preview_id,
            import_type=import_type,
            filename=filename,
            total_rows=total_rows,
            valid_rows=valid_count,
            invalid_rows=invalid_count,
            warning_rows=warning_count,
            can_commit_atomic=(invalid_count == 0 and valid_count > 0),
            can_commit_valid_only=(valid_count > 0),
            column_headers=column_headers,
            missing_required_headers=[],
            rows=validated_rows,
            summary=summary,
        )

    @classmethod
    def _validate_exam_row(
        cls,
        data: Dict[str, Any],
        row_num: int,
        errors: List[str],
        warnings: List[str],
        seen_in_batch: Set[str],
        existing_exam_codes: Set[str],
    ) -> None:
        """Validate an individual examination row."""
        code = str(data.get("exam_code", "")).strip()
        name = str(data.get("subject_name", "")).strip()

        if not code:
            errors.append("Examination code ('exam_code') cannot be empty.")
        else:
            if code in seen_in_batch:
                errors.append(f"Duplicate examination code '{code}' within uploaded CSV.")
            elif code in existing_exam_codes:
                errors.append(f"Examination code '{code}' already exists in database.")
            else:
                seen_in_batch.add(code)

        if not name:
            errors.append("Subject title ('subject_name') cannot be empty.")

        duration_val = data.get("duration")
        if duration_val:
            try:
                dur = int(duration_val)
                if dur <= 0:
                    errors.append(f"Duration must be a positive integer, got '{duration_val}'.")
            except ValueError:
                errors.append(f"Duration must be an integer (in minutes), got '{duration_val}'.")

    @classmethod
    def _validate_student_row(
        cls,
        data: Dict[str, Any],
        row_num: int,
        errors: List[str],
        warnings: List[str],
        seen_in_batch: Set[str],
        existing_student_ids: Set[str],
    ) -> None:
        """Validate an individual student row."""
        s_id = str(data.get("student_id", "")).strip()

        if not s_id:
            errors.append("Student ID ('student_id') cannot be empty.")
        else:
            if s_id in seen_in_batch:
                errors.append(f"Duplicate student ID '{s_id}' within uploaded CSV.")
            elif s_id in existing_student_ids:
                errors.append(f"Student ID '{s_id}' already exists in database.")
            else:
                seen_in_batch.add(s_id)

    @classmethod
    def _validate_enrolment_row(
        cls,
        data: Dict[str, Any],
        row_num: int,
        errors: List[str],
        warnings: List[str],
        seen_in_batch: Set[Tuple[str, str]],
        existing_enrolment_pairs: Set[Tuple[str, str]],
        existing_student_ids: Set[str],
        existing_exam_codes: Set[str],
    ) -> None:
        """Validate an individual student examination enrolment row."""
        s_id = str(data.get("student_id", "")).strip()
        code = str(data.get("exam_code", "")).strip()

        if not s_id:
            errors.append("Student ID ('student_id') is required.")
        elif s_id not in existing_student_ids:
            errors.append(
                f"Unknown student ID '{s_id}'. Student must be registered before creating an enrolment."
            )

        if not code:
            errors.append("Examination code ('exam_code') is required.")
        elif code not in existing_exam_codes:
            errors.append(
                f"Unknown examination code '{code}'. Course must be registered before enrolling students."
            )

        if s_id and code:
            pair = (s_id, code)
            if pair in seen_in_batch:
                errors.append(f"Duplicate enrolment pair ({s_id}, {code}) within uploaded CSV.")
            elif pair in existing_enrolment_pairs:
                errors.append(f"Student '{s_id}' is already enrolled in '{code}' in the database.")
            else:
                seen_in_batch.add(pair)

    @classmethod
    def commit_import(
        cls, db: Session, request: ImportCommitRequest
    ) -> ImportCommitResponse:
        """Commit validated preview batch transactionally with strict atomicity or valid-only strategy."""
        preview = cls._preview_cache.get(request.preview_id)
        if not preview:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Import preview session expired or not found. Please upload and re-validate your CSV file.",
            )

        if preview["import_type"] != request.import_type:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Preview dataset type mismatch: expected '{preview['import_type']}', got '{request.import_type}'.",
            )

        rows: List[ImportRowValidation] = preview["rows"]

        if request.strategy == "atomic" and preview["invalid_rows"] > 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"Cannot execute atomic import: {preview['invalid_rows']} rows have fatal errors. "
                    "Fix validation errors or choose the 'valid_only' strategy to skip invalid rows."
                ),
            )

        # Filter rows eligible for insertion
        rows_to_insert = [
            r for r in rows if r.status in ("valid", "warning")
        ]
        rejected_count = preview["invalid_rows"]
        skipped_count = 0
        inserted_count = 0

        # Execute transactional insert
        try:
            if request.import_type == "exams":
                inserted_count, skipped_count = cls._commit_exams(
                    db, rows_to_insert, request.strategy
                )
            elif request.import_type == "students":
                inserted_count, skipped_count = cls._commit_students(
                    db, rows_to_insert, request.strategy
                )
            elif request.import_type == "enrolments":
                inserted_count, skipped_count = cls._commit_enrolments(
                    db, rows_to_insert, request.strategy
                )

            db.commit()

            # Invalidate preview cache
            cls._preview_cache.pop(request.preview_id, None)

            # Recompute conflict graph metrics
            graph = GraphService.get_conflict_graph(db)
            current_fingerprint = GraphService.compute_graph_fingerprint(db)

            # Check if any saved schedules are now stale
            is_any_schedule_stale = False
            saved_schedules = db.query(SavedSchedule).all()
            for s in saved_schedules:
                if s.graph_fingerprint != current_fingerprint:
                    is_any_schedule_stale = True
                    break

            msg = (
                f"Successfully imported {inserted_count} {request.import_type} records. "
                f"Skipped: {skipped_count}, Rejected: {rejected_count}."
            )

            return ImportCommitResponse(
                import_type=request.import_type,
                strategy=request.strategy,
                total_processed=len(rows),
                inserted_count=inserted_count,
                skipped_count=skipped_count,
                rejected_count=rejected_count,
                message=msg,
                resulting_graph_vertices=graph.vertex_count,
                resulting_graph_edges=graph.edge_count,
                graph_fingerprint=current_fingerprint,
                is_schedule_stale=is_any_schedule_stale,
            )

        except Exception as e:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Database transaction rolled back due to error: {str(e)}",
            )

    @classmethod
    def _commit_exams(
        cls, db: Session, rows: List[ImportRowValidation], strategy: str
    ) -> Tuple[int, int]:
        """Insert validated examination records."""
        inserted = 0
        skipped = 0
        existing_codes = {code for (code,) in db.query(ExamModel.code).all()}

        for row in rows:
            data = row.data
            code = str(data.get("exam_code", "")).strip()
            name = str(data.get("subject_name", "")).strip()
            dept = str(data.get("department", "")).strip() or None
            sem = str(data.get("semester", "")).strip() or None
            dur_str = str(data.get("duration", "")).strip()
            duration = int(dur_str) if dur_str.isdigit() else None

            if code in existing_codes:
                skipped += 1
                continue

            exam = ExamModel(
                code=code,
                name=name,
                department=dept,
                semester=sem,
                duration=duration,
            )
            db.add(exam)
            existing_codes.add(code)
            inserted += 1

        db.flush()
        return inserted, skipped

    @classmethod
    def _commit_students(
        cls, db: Session, rows: List[ImportRowValidation], strategy: str
    ) -> Tuple[int, int]:
        """Insert validated student records."""
        inserted = 0
        skipped = 0
        existing_ids = {s_id for (s_id,) in db.query(StudentModel.student_id).all()}

        for row in rows:
            data = row.data
            s_id = str(data.get("student_id", "")).strip()
            name = (
                str(data.get("student_name") or data.get("display_name") or "").strip()
                or None
            )

            if s_id in existing_ids:
                skipped += 1
                continue

            student = StudentModel(
                student_id=s_id,
                display_name=name,
            )
            db.add(student)
            existing_ids.add(s_id)
            inserted += 1

        db.flush()
        return inserted, skipped

    @classmethod
    def _commit_enrolments(
        cls, db: Session, rows: List[ImportRowValidation], strategy: str
    ) -> Tuple[int, int]:
        """Insert validated course enrolment records."""
        inserted = 0
        skipped = 0

        # Create quick code -> id maps
        student_id_map = {
            s.student_id: s.id for s in db.query(StudentModel).all()
        }
        exam_id_map = {e.code: e.id for e in db.query(ExamModel).all()}

        existing_pairs: Set[Tuple[str, str]] = set()
        for e in db.query(EnrolmentModel).all():
            if e.student and e.exam:
                existing_pairs.add((e.student.student_id, e.exam.code))

        for row in rows:
            data = row.data
            s_id = str(data.get("student_id", "")).strip()
            code = str(data.get("exam_code", "")).strip()

            pair = (s_id, code)
            if pair in existing_pairs:
                skipped += 1
                continue

            student_uuid = student_id_map.get(s_id)
            exam_uuid = exam_id_map.get(code)

            if not student_uuid or not exam_uuid:
                skipped += 1
                continue

            enrolment = EnrolmentModel(
                student_id=student_uuid,
                exam_id=exam_uuid,
            )
            db.add(enrolment)
            existing_pairs.add(pair)
            inserted += 1

        db.flush()
        return inserted, skipped

    @classmethod
    def generate_validation_report_csv(cls, preview_id: str) -> str:
        """Generate a downloadable RFC 4180 CSV validation audit report for an uploaded batch."""
        preview = cls._preview_cache.get(preview_id)
        if not preview:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Validation report expired or not found. Please re-validate the file.",
            )

        output = io.StringIO()
        writer = csv.writer(output, quoting=csv.QUOTE_MINIMAL)

        writer.writerow([
            "CSV Line Number",
            "Validation Status",
            "Errors",
            "Warnings",
            "Input Record Snapshot",
        ])

        for row in preview["rows"]:
            errors_str = " | ".join(row.errors) if row.errors else "None"
            warnings_str = " | ".join(row.warnings) if row.warnings else "None"
            data_str = ", ".join(f"{k}={v}" for k, v in row.data.items())

            writer.writerow([
                row.row_number,
                row.status.upper(),
                errors_str,
                warnings_str,
                data_str,
            ])

        return output.getvalue()

    @classmethod
    def generate_csv_template(cls, import_type: str) -> str:
        """Generate downloadable, correctly encoded RFC 4180 CSV template with example row."""
        output = io.StringIO()
        writer = csv.writer(output, quoting=csv.QUOTE_MINIMAL)

        if import_type == "exams":
            writer.writerow(["exam_code", "subject_name", "department", "semester", "duration"])
            writer.writerow(["CS101", "Introduction to Computer Science", "Computer Science", "Fall 2026", 180])
            writer.writerow(["MATH101", "Single Variable Calculus", "Mathematics", "Fall 2026", 150])
            writer.writerow(["PHYS101", "Classical Mechanics", "Physics", "Fall 2026", 180])
        elif import_type == "students":
            writer.writerow(["student_id", "student_name"])
            writer.writerow(["S1001", "Ada Lovelace"])
            writer.writerow(["S1002", "Alan Turing"])
            writer.writerow(["S1003", "Grace Hopper"])
        elif import_type == "enrolments":
            writer.writerow(["student_id", "exam_code"])
            writer.writerow(["S1001", "CS101"])
            writer.writerow(["S1001", "MATH101"])
            writer.writerow(["S1002", "CS101"])
            writer.writerow(["S1002", "PHYS101"])
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unknown template type '{import_type}'. Supported: 'exams', 'students', 'enrolments'.",
            )

        return output.getvalue()
