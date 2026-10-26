"""Tests for Backtracking K-Coloring algorithm."""

import pytest

from backend.app.algorithms.backtracking import backtracking_k_coloring
from backend.app.graph.model import ConflictGraph
from backend.app.schemas.models import ColoringStatus
from backend.app.validation.validator import validate_schedule


class TestBacktrackingKColoring:
    """Test suite for Backtracking K-Coloring."""

    def test_empty_graph(self):
        """Empty graph should succeed with 0 colors for any valid k."""
        graph = ConflictGraph()
        result = backtracking_k_coloring(graph, k=3)
        assert result.status == ColoringStatus.SUCCESS
        assert result.is_complete is True
        assert result.color_count == 0
        assert result.assignment == {}
        assert result.metadata["proven_infeasible"] is False

    def test_isolated_examination(self):
        """Isolated examination should be colorable with k=1."""
        graph = ConflictGraph(["EXAM1"])
        result = backtracking_k_coloring(graph, k=1)
        assert result.status == ColoringStatus.SUCCESS
        assert result.is_complete is True
        assert result.color_count == 1
        assert result.assignment == {"EXAM1": 1}

    def test_triangle_graph_requires_three_colors_finds_valid_coloring(self):
        """Triangle graph (K3) must find a valid coloring when k=3."""
        graph = ConflictGraph(["A", "B", "C"])
        graph.add_edge("A", "B")
        graph.add_edge("B", "C")
        graph.add_edge("A", "C")

        result = backtracking_k_coloring(graph, k=3)
        assert result.status == ColoringStatus.SUCCESS
        assert result.is_complete is True
        assert result.color_count == 3

        # Validate with independent validator
        report = validate_schedule(graph, result.assignment, max_colors=3)
        assert report.is_valid is True
        assert len(report.errors) == 0

    def test_triangle_graph_proves_infeasibility_when_k_is_insufficient(self):
        """Triangle graph with k=2 must exhaustively prove infeasibility."""
        graph = ConflictGraph(["A", "B", "C"])
        graph.add_edge("A", "B")
        graph.add_edge("B", "C")
        graph.add_edge("A", "C")

        result = backtracking_k_coloring(graph, k=2)
        assert result.status == ColoringStatus.INFEASIBLE
        assert result.is_complete is False
        assert result.metadata["proven_infeasible"] is True
        assert result.metadata["nodes_explored"] > 0
        assert result.metadata["backtracks"] > 0
        assert result.assignment == {}

    def test_bipartite_graph_colored_with_k_equals_two(self):
        """A bipartite graph with edges can be colored with k=2."""
        graph = ConflictGraph(["U1", "U2", "V1", "V2"])
        graph.add_edge("U1", "V1")
        graph.add_edge("U1", "V2")
        graph.add_edge("U2", "V1")
        graph.add_edge("U2", "V2")

        result = backtracking_k_coloring(graph, k=2)
        assert result.status == ColoringStatus.SUCCESS
        assert result.is_complete is True
        assert result.color_count == 2

        report = validate_schedule(graph, result.assignment, max_colors=2)
        assert report.is_valid is True

    def test_odd_cycle_c5_chromatic_number(self):
        """Odd cycle C5 requires 3 colors; k=2 must be proven infeasible, k=3 succeeds."""
        graph = ConflictGraph([f"C{i}" for i in range(5)])
        for i in range(5):
            graph.add_edge(f"C{i}", f"C{(i + 1) % 5}")

        # k=2 must be infeasible
        result_k2 = backtracking_k_coloring(graph, k=2)
        assert result_k2.status == ColoringStatus.INFEASIBLE
        assert result_k2.metadata["proven_infeasible"] is True

        # k=3 must succeed
        result_k3 = backtracking_k_coloring(graph, k=3)
        assert result_k3.status == ColoringStatus.SUCCESS
        assert result_k3.color_count == 3
        report = validate_schedule(graph, result_k3.assignment, max_colors=3)
        assert report.is_valid is True

    def test_k4_complete_graph_infeasibility_with_k_equals_three(self):
        """Complete graph K4 requires 4 colors; k=3 must be proven infeasible."""
        vertices = ["V1", "V2", "V3", "V4"]
        graph = ConflictGraph(vertices)
        for i in range(len(vertices)):
            for j in range(i + 1, len(vertices)):
                graph.add_edge(vertices[i], vertices[j])

        result = backtracking_k_coloring(graph, k=3)
        assert result.status == ColoringStatus.INFEASIBLE
        assert result.is_complete is False
        assert result.metadata["proven_infeasible"] is True

    def test_resource_limit_termination_with_max_nodes(self):
        """Search must terminate with LIMIT_EXCEEDED when max_nodes is hit, NOT proven infeasible."""
        # Use K4 with k=2 which requires multiple backtracks to prove infeasible
        vertices = ["V1", "V2", "V3", "V4"]
        graph = ConflictGraph(vertices)
        for i in range(len(vertices)):
            for j in range(i + 1, len(vertices)):
                graph.add_edge(vertices[i], vertices[j])

        # Limit to 2 nodes
        result = backtracking_k_coloring(graph, k=2, max_nodes=2)
        assert result.status == ColoringStatus.LIMIT_EXCEEDED
        assert result.is_complete is False
        assert result.metadata["proven_infeasible"] is False
        assert result.metadata["resource_limit_hit"] == "node_limit"
        assert result.metadata["nodes_explored"] >= 2

    def test_resource_limit_termination_with_timeout(self):
        """Search should terminate with LIMIT_EXCEEDED when timeout expires."""
        # Create an elusive cycle or bipartite instance and give a tiny timeout
        vertices = [f"V{i}" for i in range(12)]
        graph = ConflictGraph(vertices)
        # dense graph
        for i in range(len(vertices)):
            for j in range(i + 1, len(vertices)):
                if (i + j) % 2 == 1:
                    graph.add_edge(vertices[i], vertices[j])

        result = backtracking_k_coloring(graph, k=2, timeout_seconds=0.00001)
        # Either succeeded instantly or exceeded limit, but if exceeded it must be LIMIT_EXCEEDED
        if result.status == ColoringStatus.LIMIT_EXCEEDED:
            assert result.metadata["proven_infeasible"] is False
            assert result.metadata["resource_limit_hit"] == "timeout"

    def test_search_diagnostics_recorded(self):
        """Metadata must contain explored nodes, backtracks, and elapsed time."""
        graph = ConflictGraph(["A", "B", "C"])
        graph.add_edge("A", "B")
        graph.add_edge("B", "C")
        graph.add_edge("A", "C")

        result = backtracking_k_coloring(graph, k=3)
        assert "nodes_explored" in result.metadata
        assert "backtracks" in result.metadata
        assert "elapsed_time_ms" in result.metadata
        assert result.metadata["nodes_explored"] >= 3
        assert result.metadata["elapsed_time_ms"] >= 0.0

    def test_invalid_parameters_raise(self):
        """Invalid k, max_nodes, or timeout_seconds must raise ValueError."""
        graph = ConflictGraph(["A"])
        with pytest.raises(ValueError, match="k must be a positive integer"):
            backtracking_k_coloring(graph, k=0)
        with pytest.raises(ValueError, match="k must be a positive integer"):
            backtracking_k_coloring(graph, k=-1)
        with pytest.raises(ValueError, match="max_nodes must be a positive integer"):
            backtracking_k_coloring(graph, k=2, max_nodes=0)
        with pytest.raises(ValueError, match="timeout_seconds must be a positive number"):
            backtracking_k_coloring(graph, k=2, timeout_seconds=0)
