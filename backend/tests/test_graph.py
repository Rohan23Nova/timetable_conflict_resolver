"""Tests for ConflictGraph and graph builder."""

import pytest

from backend.app.graph.builder import (
    UnknownExamReferenceError,
    build_conflict_graph,
)
from backend.app.graph.model import (
    ConflictGraph,
    SelfLoopError,
    VertexNotFoundError,
)
from backend.app.schemas.models import Enrolment, Exam


class TestConflictGraphModel:
    """Test suite for ConflictGraph data structure."""

    def test_empty_graph(self):
        """Empty graph should have 0 vertices and 0 edges."""
        graph = ConflictGraph()
        assert graph.vertex_count == 0
        assert graph.edge_count == 0
        assert graph.vertices == []
        assert len(graph) == 0

    def test_isolated_examination(self):
        """Isolated examination should exist as a vertex with degree 0."""
        graph = ConflictGraph()
        graph.add_vertex("CS101")
        assert graph.vertex_count == 1
        assert graph.edge_count == 0
        assert graph.has_vertex("CS101")
        assert graph.get_degree("CS101") == 0
        assert graph.get_neighbors("CS101") == set()
        assert graph.get_sorted_neighbors("CS101") == []

    def test_symmetric_adjacency_and_unique_edge_counting(self):
        """Adding an undirected edge must create symmetric adjacency without duplicate counting."""
        graph = ConflictGraph(["CS101", "MATH201"])
        graph.add_edge("CS101", "MATH201")

        # Symmetric adjacency
        assert graph.has_edge("CS101", "MATH201")
        assert graph.has_edge("MATH201", "CS101")
        assert "MATH201" in graph.get_neighbors("CS101")
        assert "CS101" in graph.get_neighbors("MATH201")

        # Edge count should be exactly 1
        assert graph.edge_count == 1
        assert graph.get_degree("CS101") == 1
        assert graph.get_degree("MATH201") == 1

        # Adding the same edge again (in reverse) must not duplicate edge count
        graph.add_edge("MATH201", "CS101")
        assert graph.edge_count == 1

    def test_reject_self_loop(self):
        """Graph must raise SelfLoopError when adding an edge from a vertex to itself."""
        graph = ConflictGraph(["CS101"])
        with pytest.raises(SelfLoopError, match="Self-loops are not permitted"):
            graph.add_edge("CS101", "CS101")

    def test_reject_unknown_vertices_in_add_edge(self):
        """Graph must raise VertexNotFoundError when connecting non-existent vertices."""
        graph = ConflictGraph(["CS101"])
        with pytest.raises(VertexNotFoundError, match="Vertex 'UNKNOWN' does not exist"):
            graph.add_edge("CS101", "UNKNOWN")

        with pytest.raises(VertexNotFoundError, match="Vertex 'UNKNOWN' does not exist"):
            graph.add_edge("UNKNOWN", "CS101")

    def test_query_unknown_vertex_raises(self):
        """Querying degree or neighbors of an unknown vertex should raise VertexNotFoundError."""
        graph = ConflictGraph()
        with pytest.raises(VertexNotFoundError):
            graph.get_degree("NON_EXISTENT")
        with pytest.raises(VertexNotFoundError):
            graph.get_neighbors("NON_EXISTENT")

    def test_deterministic_vertex_ordering(self):
        """Vertices and ordered_vertices should return deterministic lists."""
        graph = ConflictGraph(["Z99", "A01", "M50", "B02"])
        # Natural sorted order
        assert graph.vertices == ["A01", "B02", "M50", "Z99"]

        # Degrees: make M50 have degree 2, A01 degree 1, B02 degree 1, Z99 degree 0
        graph.add_edge("M50", "A01")
        graph.add_edge("M50", "B02")

        # Descending degree: M50 (deg 2), then A01 (deg 1), B02 (deg 1) tie-broken by ID, Z99 (deg 0)
        ordered = graph.get_ordered_vertices(by_degree=True, descending=True)
        assert ordered == ["M50", "A01", "B02", "Z99"]


class TestGraphBuilder:
    """Test suite for graph construction from student enrolments."""

    def test_graph_construction_from_shared_student_enrolments(self):
        """Students enrolled in multiple exams should generate pairwise conflict edges."""
        exams = ["CS101", "MATH101", "PHYS101", "HIST101"]
        # Student 1: CS101 & MATH101 (conflict)
        # Student 2: MATH101 & PHYS101 (conflict)
        # Student 3: HIST101 only (no conflict)
        enrolments = [
            ("S1", "CS101"),
            ("S1", "MATH101"),
            ("S2", "MATH101"),
            ("S2", "PHYS101"),
            ("S3", "HIST101"),
        ]

        graph = build_conflict_graph(exams, enrolments)

        assert graph.vertex_count == 4
        assert graph.edge_count == 2
        assert graph.has_edge("CS101", "MATH101")
        assert graph.has_edge("MATH101", "PHYS101")
        assert not graph.has_edge("CS101", "PHYS101")
        assert not graph.has_edge("HIST101", "CS101")
        assert graph.get_degree("HIST101") == 0

    def test_duplicate_enrolments_handled_gracefully(self):
        """Duplicate enrolment records for the same student and exam should not duplicate edges."""
        exams = ["CS101", "CS102"]
        enrolments = [
            ("S1", "CS101"),
            ("S1", "CS101"),  # Duplicate
            ("S1", "CS102"),
            ("S1", "CS102"),  # Duplicate
        ]
        graph = build_conflict_graph(exams, enrolments)
        assert graph.vertex_count == 2
        assert graph.edge_count == 1
        assert graph.has_edge("CS101", "CS102")

    def test_examinations_with_no_registered_students(self):
        """Exams with zero students must still exist in the graph as isolated vertices."""
        exams = ["EMPTY1", "EMPTY2", "ACTIVE"]
        enrolments = [("S1", "ACTIVE")]

        graph = build_conflict_graph(exams, enrolments)
        assert graph.vertex_count == 3
        assert graph.edge_count == 0
        assert graph.has_vertex("EMPTY1")
        assert graph.has_vertex("EMPTY2")
        assert graph.has_vertex("ACTIVE")
        assert graph.get_degree("EMPTY1") == 0

    def test_invalid_reference_to_unknown_examination(self):
        """Enrolment referencing an unknown exam must raise UnknownExamReferenceError."""
        exams = ["CS101"]
        enrolments = [("S1", "UNKNOWN_EXAM")]

        with pytest.raises(UnknownExamReferenceError, match="references unknown examination"):
            build_conflict_graph(exams, enrolments)

    def test_empty_datasets(self):
        """Empty exams and empty enrolments should yield an empty graph."""
        graph = build_conflict_graph([], [])
        assert graph.vertex_count == 0
        assert graph.edge_count == 0

    def test_builder_with_schema_objects(self):
        """Builder should accept Exam and Enrolment Pydantic models."""
        exams = [Exam(id="CS101", name="Intro to CS"), Exam(id="MATH101", name="Calculus")]
        enrolments = [
            Enrolment(student_id="S100", exam_id="CS101"),
            Enrolment(student_id="S100", exam_id="MATH101"),
        ]
        graph = build_conflict_graph(exams, enrolments)
        assert graph.vertex_count == 2
        assert graph.edge_count == 1
        assert graph.has_edge("CS101", "MATH101")
