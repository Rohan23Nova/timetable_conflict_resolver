"""Service to build and serialize conflict graphs from persistent database records."""

from collections import defaultdict
from typing import Dict, List, Set
from sqlalchemy.orm import Session

from backend.app.graph.builder import build_conflict_graph
from backend.app.repositories.enrolment_repository import EnrolmentRepository
from backend.app.repositories.examination_repository import ExaminationRepository
from backend.app.schemas.graph import (
    ConflictGraphResponse,
    GraphEdge,
    GraphVertex,
)


class GraphService:
    """Service that computes the conflict graph dynamically from persistent enrolments."""

    @classmethod
    def get_conflict_graph(cls, db: Session) -> ConflictGraphResponse:
        """Construct the conflict graph using Phase 1 graph builder from persistent DB data."""
        # 1. Fetch all examinations and enrolments
        exams = ExaminationRepository.get_all(db)
        enrolments = EnrolmentRepository.get_all(db)

        # Handle empty dataset cleanly
        if not exams:
            return ConflictGraphResponse(
                vertex_count=0,
                edge_count=0,
                vertices=[],
                edges=[],
                degrees={},
                isolated_examinations=[],
                adjacency={},
            )

        # 2. Build mapping of exam code to metadata for vertices
        exam_by_code: Dict[str, dict] = {}
        for exam in exams:
            exam_by_code[exam.code] = {
                "id": exam.id,
                "code": exam.code,
                "name": exam.name,
                "department": exam.department,
                "semester": exam.semester,
            }

        # 3. Track students enrolled in each exam to calculate edge weights & shared students
        students_by_exam: Dict[str, Set[str]] = defaultdict(set)
        enrolment_tuples = []
        for enrolment in enrolments:
            if enrolment.student and enrolment.exam:
                student_code = enrolment.student.student_id
                exam_code = enrolment.exam.code
                students_by_exam[exam_code].add(student_code)
                enrolment_tuples.append((student_code, exam_code))

        # 4. Construct graph using Phase 1 graph builder
        graph = build_conflict_graph(
            examinations=[e.code for e in exams],
            enrolments=enrolment_tuples,
        )

        # 5. Extract degrees, isolated exams, and adjacency
        degrees: Dict[str, int] = {}
        isolated_examinations: List[str] = []
        adjacency: Dict[str, List[str]] = {}

        for vertex_code in graph.vertices:
            deg = graph.get_degree(vertex_code)
            degrees[vertex_code] = deg
            if deg == 0:
                isolated_examinations.append(vertex_code)
            adjacency[vertex_code] = graph.get_sorted_neighbors(vertex_code)

        # 6. Format vertices with computed degrees
        vertices: List[GraphVertex] = [
            GraphVertex(
                id=exam_by_code[code]["id"],
                code=code,
                name=exam_by_code[code]["name"],
                department=exam_by_code[code]["department"],
                semester=exam_by_code[code]["semester"],
                degree=degrees.get(code, 0),
            )
            for code in graph.vertices
        ]

        # 7. Format conflict edges with weights and shared student lists
        edges: List[GraphEdge] = []
        for u, v in graph.get_edges():
            shared = sorted(students_by_exam.get(u, set()) & students_by_exam.get(v, set()))
            edges.append(
                GraphEdge(
                    source=u,
                    target=v,
                    weight=len(shared),
                    shared_students=shared,
                )
            )

        # Sort edges deterministically by source then target
        edges.sort(key=lambda e: (e.source, e.target))

        return ConflictGraphResponse(
            vertex_count=graph.vertex_count,
            edge_count=graph.edge_count,
            vertices=vertices,
            edges=edges,
            degrees=degrees,
            isolated_examinations=isolated_examinations,
            adjacency=adjacency,
        )
