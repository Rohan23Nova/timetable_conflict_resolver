import hashlib
from collections import defaultdict
from typing import Dict, List, Set
from sqlalchemy.orm import Session

from backend.app.graph.builder import build_conflict_graph
from backend.app.graph.model import ConflictGraph
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
    def compute_graph_fingerprint(cls, db: Session) -> str:
        """Compute deterministic SHA-256 fingerprint of current graph structure and weights."""
        graph, _ = cls.build_conflict_graph_model(db)
        sorted_vertices = sorted(graph.vertices)

        enrolments = EnrolmentRepository.get_all(db)
        students_by_exam: Dict[str, Set[str]] = defaultdict(set)
        for enrolment in enrolments:
            if enrolment.student and enrolment.exam:
                students_by_exam[enrolment.exam.code].add(enrolment.student.student_id)

        edges_with_weights = []
        for u, v in sorted(graph.get_edges()):
            w = len(students_by_exam.get(u, set()) & students_by_exam.get(v, set()))
            edges_with_weights.append(f"{u}-{v}:{w}")

        canonical = f"V:{','.join(sorted_vertices)}|E:{','.join(edges_with_weights)}"
        return hashlib.sha256(canonical.encode("utf-8")).hexdigest()

    @classmethod
    def build_conflict_graph_model(
        cls, db: Session
    ) -> tuple[ConflictGraph, Dict[str, dict]]:
        """Construct ground-truth Phase 1 ConflictGraph and course metadata from persistent DB data."""
        exams = ExaminationRepository.get_all(db)
        enrolments = EnrolmentRepository.get_all(db)

        exam_by_code: Dict[str, dict] = {}
        for exam in exams:
            exam_by_code[exam.code] = {
                "id": exam.id,
                "code": exam.code,
                "name": exam.name,
                "department": exam.department,
                "semester": exam.semester,
            }

        enrolment_tuples = []
        for enrolment in enrolments:
            if enrolment.student and enrolment.exam:
                enrolment_tuples.append((enrolment.student.student_id, enrolment.exam.code))

        graph = build_conflict_graph(
            examinations=[e.code for e in exams],
            enrolments=enrolment_tuples,
        )
        return graph, exam_by_code

    @classmethod
    def get_conflict_graph(cls, db: Session) -> ConflictGraphResponse:
        """Construct the conflict graph using Phase 1 graph builder from persistent DB data."""
        exams = ExaminationRepository.get_all(db)
        enrolments = EnrolmentRepository.get_all(db)

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

        graph, exam_by_code = cls.build_conflict_graph_model(db)

        # Track students enrolled in each exam to calculate edge weights & shared students
        students_by_exam: Dict[str, Set[str]] = defaultdict(set)
        for enrolment in enrolments:
            if enrolment.student and enrolment.exam:
                students_by_exam[enrolment.exam.code].add(enrolment.student.student_id)

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
