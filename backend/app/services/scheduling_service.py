import uuid
from collections import defaultdict
from datetime import datetime, timezone
from typing import Dict, List, Optional
from sqlalchemy.orm import Session

from backend.app.algorithms.backtracking import backtracking_k_coloring
from backend.app.algorithms.greedy import greedy_coloring
from backend.app.graph.model import ConflictGraph
from backend.app.schemas.models import ColoringStatus, ValidationReport
from backend.app.schemas.scheduling import (
    ScheduleCompareRequest,
    ScheduleCompareResponse,
    ScheduleRunRequest,
    ScheduleRunResponse,
    SlotAssignmentDetail,
)
from backend.app.services.graph_service import GraphService
from backend.app.validation.validator import validate_schedule


class SchedulingService:
    """Service orchestrating timetable graph coloring runs, benchmarks, and validation."""

    # In-memory store for recent runs
    _run_store: Dict[str, ScheduleRunResponse] = {}

    @classmethod
    def run_algorithm(
        cls, request: ScheduleRunRequest, db: Session
    ) -> ScheduleRunResponse:
        """Execute a graph coloring algorithm against the persistent conflict graph."""
        graph, exam_meta = GraphService.build_conflict_graph_model(db)
        return cls._execute_single_run(graph, exam_meta, request)

    @classmethod
    def compare_algorithms(
        cls, request: ScheduleCompareRequest, db: Session
    ) -> ScheduleCompareResponse:
        """Execute both Greedy and Backtracking side-by-side on the exact same graph snapshot."""
        graph, exam_meta = GraphService.build_conflict_graph_model(db)

        # 1. Run Greedy on the snapshot
        greedy_req = ScheduleRunRequest(
            algorithm="greedy",
            ordering_strategy=request.ordering_strategy,
            max_colors=request.max_colors,
        )
        greedy_res = cls._execute_single_run(graph, exam_meta, greedy_req)

        # 2. Run Backtracking on the exact same snapshot
        # If max_colors not specified, use Greedy's slot requirement (if found) or delta+1
        k_val = request.max_colors
        if k_val is None:
            if greedy_res.is_complete and greedy_res.slots_used > 0:
                k_val = greedy_res.slots_used
            else:
                k_val = max(1, graph.max_degree + 1 if graph.vertex_count > 0 else 1)

        bt_req = ScheduleRunRequest(
            algorithm="backtracking",
            ordering_strategy=request.ordering_strategy,
            max_colors=k_val,
            max_nodes=request.max_nodes,
            timeout_seconds=request.timeout_seconds,
        )
        bt_res = cls._execute_single_run(graph, exam_meta, bt_req)

        # 3. Generate comparative synthesis
        summary_explanation = cls._generate_comparison_summary(
            graph, greedy_res, bt_res, request.max_colors
        )

        compare_id = f"cmp-{uuid.uuid4().hex[:8]}"
        return ScheduleCompareResponse(
            compare_id=compare_id,
            timestamp=datetime.now(timezone.utc),
            vertex_count=graph.vertex_count,
            edge_count=graph.edge_count,
            max_colors_constraint=request.max_colors,
            greedy_result=greedy_res,
            backtracking_result=bt_res,
            summary_explanation=summary_explanation,
        )

    @classmethod
    def get_run(cls, run_id: str) -> Optional[ScheduleRunResponse]:
        """Retrieve a previous scheduling run from memory."""
        return cls._run_store.get(run_id)

    @classmethod
    def list_runs(cls) -> List[ScheduleRunResponse]:
        """List all recent runs sorted newest first."""
        return sorted(cls._run_store.values(), key=lambda r: r.created_at, reverse=True)

    @classmethod
    def _execute_single_run(
        cls,
        graph: ConflictGraph,
        exam_meta: Dict[str, dict],
        request: ScheduleRunRequest,
    ) -> ScheduleRunResponse:
        """Internal execution logic running an algorithm, validating, and formatting response."""
        run_id = f"run-{uuid.uuid4().hex[:8]}"

        # Empty graph edge case
        if graph.vertex_count == 0:
            val_report = ValidationReport(
                is_valid=True,
                errors=[],
                checks_performed=[
                    "check_unknown_examinations",
                    "check_missing_examinations",
                    "check_color_validity",
                    "check_color_range",
                    "check_conflicts",
                ],
                conflicts=[],
                missing_examinations=[],
                unknown_examinations=[],
                invalid_color_values=[],
                out_of_range_colors=[],
                metadata={"graph_vertices": 0, "graph_edges": 0, "assignment_size": 0},
            )
            response = ScheduleRunResponse(
                run_id=run_id,
                algorithm=request.algorithm,
                ordering_strategy=request.ordering_strategy,
                max_colors=request.max_colors,
                status="COMPLETED",
                is_complete=True,
                is_valid=True,
                slots_used=0,
                slot_assignments={},
                slot_details=[],
                slots_summary={},
                execution_time_ms=0.0,
                vertex_count=0,
                edge_count=0,
                validation_report=val_report,
                statistics={},
                explanation=(
                    "The examination catalog is currently empty. No courses or enrolments "
                    "are present in the database, resulting in a trivial conflict graph (V=0, E=0)."
                ),
                created_at=datetime.now(timezone.utc),
            )
            cls._run_store[run_id] = response
            return response

        # Execute selected algorithm
        if request.algorithm == "greedy":
            result = greedy_coloring(
                graph,
                ordering_strategy=request.ordering_strategy,
                max_colors=request.max_colors,
            )
            raw_status = result.status

            if raw_status == ColoringStatus.SUCCESS:
                status_str = "COMPLETED"
                is_complete = True
            elif raw_status == ColoringStatus.INCOMPLETE:
                status_str = "INCOMPLETE"
                is_complete = False
            else:
                status_str = str(raw_status)
                is_complete = False

            # Independent validation
            if is_complete:
                validation_report = validate_schedule(
                    graph, result.assignment, max_colors=request.max_colors
                )
                is_valid = validation_report.is_valid
            else:
                validation_report = validate_schedule(
                    graph, result.assignment, max_colors=request.max_colors
                )
                is_valid = False

            if is_complete and not is_valid:
                status_str = "INVALID"

            # Format slot assignments & groups
            slot_assignments = result.assignment if is_complete else {}
            slots_used = result.color_count if is_complete else 0

            slot_details, slots_summary = cls._build_slot_structures(
                slot_assignments, exam_meta, graph
            )

            explanation = cls._generate_greedy_explanation(
                graph,
                request,
                status_str,
                slots_used,
                result.metadata.get("elapsed_time_ms", 0.0),
                result.metadata,
                is_valid,
            )

            response = ScheduleRunResponse(
                run_id=run_id,
                algorithm="greedy",
                ordering_strategy=request.ordering_strategy,
                max_colors=request.max_colors,
                status=status_str,
                is_complete=is_complete,
                is_valid=is_valid,
                slots_used=slots_used,
                slot_assignments=slot_assignments,
                slot_details=slot_details,
                slots_summary=slots_summary,
                execution_time_ms=round(result.metadata.get("elapsed_time_ms", 0.0), 3),
                vertex_count=graph.vertex_count,
                edge_count=graph.edge_count,
                validation_report=validation_report,
                statistics=result.metadata,
                explanation=explanation,
                created_at=datetime.now(timezone.utc),
            )

        elif request.algorithm == "backtracking":
            k_val = request.max_colors
            if k_val is None:
                # Default to Welsh-Powell greedy bound or delta+1 as safe search bound
                k_val = max(1, graph.max_degree + 1)

            result = backtracking_k_coloring(
                graph,
                k=k_val,
                max_nodes=request.max_nodes,
                timeout_seconds=request.timeout_seconds,
                ordering_strategy=request.ordering_strategy,
            )

            raw_status = result.status
            if raw_status == ColoringStatus.SUCCESS:
                status_str = "COMPLETED"
                is_complete = True
            elif raw_status == ColoringStatus.INFEASIBLE:
                status_str = "INFEASIBLE"
                is_complete = False
            elif raw_status == ColoringStatus.LIMIT_EXCEEDED:
                status_str = "RESOURCE_LIMITED"
                is_complete = False
            else:
                status_str = str(raw_status)
                is_complete = False

            # Independent validation
            if is_complete:
                validation_report = validate_schedule(
                    graph, result.assignment, max_colors=k_val
                )
                is_valid = validation_report.is_valid
            else:
                validation_report = validate_schedule(
                    graph, result.assignment, max_colors=k_val
                )
                is_valid = False

            if is_complete and not is_valid:
                status_str = "INVALID"

            slot_assignments = result.assignment if is_complete else {}
            slots_used = result.color_count if is_complete else 0

            slot_details, slots_summary = cls._build_slot_structures(
                slot_assignments, exam_meta, graph
            )

            explanation = cls._generate_backtracking_explanation(
                graph,
                request,
                status_str,
                k_val,
                slots_used,
                result.metadata.get("elapsed_time_ms", 0.0),
                result.metadata,
                is_valid,
            )

            response = ScheduleRunResponse(
                run_id=run_id,
                algorithm="backtracking",
                ordering_strategy=request.ordering_strategy,
                max_colors=k_val,
                status=status_str,
                is_complete=is_complete,
                is_valid=is_valid,
                slots_used=slots_used,
                slot_assignments=slot_assignments,
                slot_details=slot_details,
                slots_summary=slots_summary,
                execution_time_ms=round(result.metadata.get("elapsed_time_ms", 0.0), 3),
                vertex_count=graph.vertex_count,
                edge_count=graph.edge_count,
                validation_report=validation_report,
                statistics=result.metadata,
                explanation=explanation,
                created_at=datetime.now(timezone.utc),
            )
        else:
            raise ValueError(f"Unsupported algorithm: '{request.algorithm}'")

        cls._run_store[run_id] = response
        return response

    @classmethod
    def _build_slot_structures(
        cls,
        assignment: Dict[str, int],
        exam_meta: Dict[str, dict],
        graph: ConflictGraph,
    ) -> tuple[List[SlotAssignmentDetail], Dict[int, List[str]]]:
        """Convert flat exam->slot assignment into sorted slot details and slot summary groups."""
        slot_details: List[SlotAssignmentDetail] = []
        slots_summary: Dict[int, List[str]] = defaultdict(list)

        for exam_code, slot in assignment.items():
            meta = exam_meta.get(exam_code, {})
            detail = SlotAssignmentDetail(
                exam_code=exam_code,
                exam_name=meta.get("name", ""),
                slot=slot,
                department=meta.get("department"),
                semester=meta.get("semester"),
                degree=graph.get_degree(exam_code),
            )
            slot_details.append(detail)
            slots_summary[slot].append(exam_code)

        # Sort slot details by slot number, then by code
        slot_details.sort(key=lambda d: (d.slot, d.exam_code))

        # Sort summary codes inside each slot
        summary_dict: Dict[int, List[str]] = {
            slot: sorted(codes) for slot, codes in sorted(slots_summary.items())
        }

        return slot_details, summary_dict

    @classmethod
    def _generate_greedy_explanation(
        cls,
        graph: ConflictGraph,
        request: ScheduleRunRequest,
        status: str,
        slots_used: int,
        elapsed_ms: float,
        stats: dict,
        is_valid: bool,
    ) -> str:
        """Produce a plain-language explanation of Greedy Coloring behavior and limitations."""
        ordering_name = (
            "Welsh-Powell descending degree"
            if request.ordering_strategy == "descending_degree"
            else "natural alphabetical"
        )

        if status == "COMPLETED" and is_valid:
            return (
                f"Greedy Coloring ({ordering_name}) successfully assigned all {graph.vertex_count} "
                f"examinations into {slots_used} conflict-free time slots in {elapsed_ms:.2f} ms. "
                "The independent validator confirmed zero adjacent color clashes. "
                "Note: Greedy coloring is a polynomial-time heuristic (O(|V|²)); it efficiently "
                "finds a valid schedule but does not mathematically guarantee the minimum chromatic "
                "number χ(G)."
            )
        elif status == "INCOMPLETE":
            failed_vertex = stats.get("failed_at_vertex", "unknown")
            needed_color = stats.get("required_color", request.max_colors + 1)
            return (
                f"Greedy Coloring halted because it could not schedule course '{failed_vertex}' "
                f"within the maximum allowed limit of {request.max_colors} time slots (it required slot {needed_color}). "
                "Because Greedy decisions are irrevocable, no valid timetable could be produced under "
                "this ordering and slot constraint. Consider increasing time slots or running Backtracking search."
            )
        elif not is_valid:
            return (
                f"Greedy coloring finished but failed independent schedule validation. "
                "The proposed assignment violates conflict constraints or course completeness."
            )
        return f"Greedy coloring completed with status {status}."

    @classmethod
    def _generate_backtracking_explanation(
        cls,
        graph: ConflictGraph,
        request: ScheduleRunRequest,
        status: str,
        k_val: int,
        slots_used: int,
        elapsed_ms: float,
        stats: dict,
        is_valid: bool,
    ) -> str:
        """Produce a plain-language explanation for Backtracking outcomes."""
        nodes = stats.get("nodes_explored", 0)
        backtracks = stats.get("backtracks", 0)

        if status == "COMPLETED" and is_valid:
            return (
                f"Backtracking exact search explored {nodes:,} decision states with {backtracks:,} "
                f"backtracks in {elapsed_ms:.2f} ms, successfully finding a verified {slots_used}-slot "
                f"timetable within the bound k={k_val}. Independent validation confirmed 100% "
                "conflict-free scheduling."
            )
        elif status == "INFEASIBLE":
            return (
                f"Backtracking search exhaustively explored all relevant colorings ({nodes:,} states, "
                f"{backtracks:,} backtracks in {elapsed_ms:.2f} ms) and mathematically PROVED that "
                f"no conflict-free timetable exists with ≤ {k_val} time slots. "
                f"The chromatic number satisfies χ(G) > {k_val}. At least {k_val + 1} slots are required."
            )
        elif status == "RESOURCE_LIMITED":
            limit_reason = stats.get("resource_limit_hit", "safety")
            return (
                f"Backtracking search stopped after {nodes:,} states ({elapsed_ms:.2f} ms) because the "
                f"{limit_reason} limit was reached. This search is INCOMPLETE — it does NOT prove "
                "infeasibility. A valid schedule may exist in the unexplored space. "
                "Try increasing the timeout limit, raising max decision nodes, or using Welsh-Powell ordering."
            )
        return f"Backtracking search completed with status {status}."

    @classmethod
    def _generate_comparison_summary(
        cls,
        graph: ConflictGraph,
        greedy: ScheduleRunResponse,
        bt: ScheduleRunResponse,
        k_constraint: Optional[int],
    ) -> str:
        """Synthesize side-by-side comparison between Greedy and Backtracking."""
        if graph.vertex_count == 0:
            return "Both algorithms evaluated an empty conflict graph with zero required slots."

        parts = []

        # 1. Slot efficiency comparison
        if greedy.is_complete and bt.is_complete:
            if bt.slots_used < greedy.slots_used:
                parts.append(
                    f"Backtracking achieved superior slot efficiency, scheduling all exams in {bt.slots_used} "
                    f"slots compared to Greedy's {greedy.slots_used} slots (saved {greedy.slots_used - bt.slots_used} slot(s))."
                )
            elif bt.slots_used == greedy.slots_used:
                parts.append(
                    f"Both algorithms arrived at the same slot count ({greedy.slots_used} slots), "
                    "demonstrating that the Welsh-Powell greedy ordering produced an optimal or near-optimal result."
                )
            else:
                parts.append(
                    f"Greedy required {greedy.slots_used} slots, while Backtracking was tested at k={bt.max_colors}."
                )
        elif greedy.is_complete and not bt.is_complete:
            if bt.status == "INFEASIBLE":
                parts.append(
                    f"Greedy found a {greedy.slots_used}-slot timetable, but Backtracking proved k={bt.max_colors} "
                    f"is infeasible. Greedy's solution demonstrates that χ(G) ≤ {greedy.slots_used}."
                )
            elif bt.status == "RESOURCE_LIMITED":
                parts.append(
                    f"Greedy quickly generated a valid {greedy.slots_used}-slot timetable in {greedy.execution_time_ms:.2f} ms, "
                    f"while Backtracking timed out or hit node limits at k={bt.max_colors} without reaching a conclusion."
                )
        elif not greedy.is_complete and bt.is_complete:
            parts.append(
                f"Backtracking successfully found an exact {bt.slots_used}-slot solution where Greedy's heuristic "
                f"exceeded the slot constraint."
            )
        else:
            parts.append(
                f"Neither algorithm completed a timetable: Greedy had status '{greedy.status}' "
                f"and Backtracking had status '{bt.status}'."
            )

        # 2. Runtime and search effort
        nodes = bt.statistics.get("nodes_explored", 0)
        parts.append(
            f"Greedy executed in {greedy.execution_time_ms:.2f} ms (polynomial heuristic), whereas "
            f"Backtracking explored {nodes:,} decision nodes over {bt.execution_time_ms:.2f} ms (exhaustive exponential search)."
        )

        return " ".join(parts)
