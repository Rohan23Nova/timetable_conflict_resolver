"""Tests for Greedy Graph Coloring algorithm."""

import pytest

from backend.app.algorithms.greedy import greedy_coloring
from backend.app.graph.model import ConflictGraph
from backend.app.schemas.models import ColoringStatus
from backend.app.validation.validator import validate_schedule


class TestGreedyColoring:
    """Test suite for Greedy Graph Coloring."""

    def test_empty_graph(self):
        """Greedy coloring on an empty graph should succeed with 0 colors."""
        graph = ConflictGraph()
        result = greedy_coloring(graph)
        assert result.status == ColoringStatus.SUCCESS
        assert result.is_complete is True
        assert result.color_count == 0
        assert result.assignment == {}

    def test_isolated_examination(self):
        """An isolated examination should be assigned color 1."""
        graph = ConflictGraph(["EXAM1"])
        result = greedy_coloring(graph)
        assert result.status == ColoringStatus.SUCCESS
        assert result.is_complete is True
        assert result.color_count == 1
        assert result.assignment == {"EXAM1": 1}

    def test_triangle_graph_requires_three_colors(self):
        """A triangle graph (K3) must require exactly 3 distinct colors."""
        graph = ConflictGraph(["A", "B", "C"])
        graph.add_edge("A", "B")
        graph.add_edge("B", "C")
        graph.add_edge("A", "C")

        result = greedy_coloring(graph, ordering_strategy="descending_degree")
        assert result.status == ColoringStatus.SUCCESS
        assert result.is_complete is True
        assert result.color_count == 3

        # Verify no adjacent vertices share a color
        report = validate_schedule(graph, result.assignment)
        assert report.is_valid is True
        assert len(set(result.assignment.values())) == 3

    def test_bipartite_graph_with_edge_colors_in_two_colors(self):
        """A bipartite graph with edges (e.g. K2,2 or a simple tree) can be colored in 2 colors."""
        # Bipartite with parts {U1, U2} and {V1, V2}
        graph = ConflictGraph(["U1", "U2", "V1", "V2"])
        graph.add_edge("U1", "V1")
        graph.add_edge("U1", "V2")
        graph.add_edge("U2", "V1")
        graph.add_edge("U2", "V2")

        result = greedy_coloring(graph, ordering_strategy="descending_degree")
        assert result.status == ColoringStatus.SUCCESS
        assert result.is_complete is True
        assert result.color_count == 2

        # Validate with independent validator
        report = validate_schedule(graph, result.assignment)
        assert report.is_valid is True

    def test_greedy_under_restrictive_color_limit(self):
        """If max_colors is less than required, greedy must return INCOMPLETE and not successful."""
        # Triangle graph requires 3 colors
        graph = ConflictGraph(["A", "B", "C"])
        graph.add_edge("A", "B")
        graph.add_edge("B", "C")
        graph.add_edge("A", "C")

        # Restrict to max 2 colors
        result = greedy_coloring(graph, max_colors=2)
        assert result.status == ColoringStatus.INCOMPLETE
        assert result.is_complete is False
        assert "reason" in result.metadata
        assert result.metadata["max_colors"] == 2

    def test_greedy_coloring_suboptimality_on_crown_graph(self):
        """Crown graph C6 (bipartite) is 2-colorable, but natural ordering can force 3 colors."""
        # Vertices: U1, U2, U3 and V1, V2, V3
        # Edges between Ui and Vj for all i != j
        graph = ConflictGraph(["U1", "U2", "U3", "V1", "V2", "V3"])
        for i in [1, 2, 3]:
            for j in [1, 2, 3]:
                if i != j:
                    graph.add_edge(f"U{i}", f"V{j}")

        # Natural ordering: U1, U2, U3, V1, V2, V3
        # U1: 1
        # U2: 1
        # U3: 1
        # V1 (adj U2, U3): needs 2
        # V2 (adj U1, U3): needs 2
        # V3 (adj U1, U2): needs 2
        # But if interleaved:
        custom_graph = ConflictGraph(["A1", "A2", "B1", "B2", "C1", "C2"])
        # A1-B2, A1-C2, B1-A2, B1-C2, C1-A2, C1-B2
        custom_graph.add_edge("A1", "B2")
        custom_graph.add_edge("A1", "C2")
        custom_graph.add_edge("B1", "A2")
        custom_graph.add_edge("B1", "C2")
        custom_graph.add_edge("C1", "A2")
        custom_graph.add_edge("C1", "B2")
        # In natural order: A1, A2, B1, B2, C1, C2
        # A1 -> 1
        # A2 -> 1 (no edge to A1)
        # B1 -> 2 (connected to A2)
        # B2 -> 2 (connected to A1)
        # C1 -> 3 (connected to A2 and B2)
        # C2 -> 3 (connected to A1 and B1)
        result_suboptimal = greedy_coloring(custom_graph, ordering_strategy="natural")
        assert result_suboptimal.color_count == 3  # Uses 3 colors even though graph is bipartite (chi = 2)!

        # Confirm the validator accepts the 3-coloring
        report = validate_schedule(custom_graph, result_suboptimal.assignment)
        assert report.is_valid is True

    def test_ordering_strategies(self):
        """Greedy coloring should support both natural and descending_degree ordering deterministically."""
        # Graph with star topology: Center has high degree
        graph = ConflictGraph(["Center", "Leaf1", "Leaf2", "Leaf3"])
        graph.add_edge("Center", "Leaf1")
        graph.add_edge("Center", "Leaf2")
        graph.add_edge("Center", "Leaf3")

        result_deg = greedy_coloring(graph, ordering_strategy="descending_degree")
        assert result_deg.status == ColoringStatus.SUCCESS
        # Center should be colored first (color 1), leaves get color 2
        assert result_deg.assignment["Center"] == 1
        assert result_deg.color_count == 2

        result_nat = greedy_coloring(graph, ordering_strategy="natural")
        assert result_nat.status == ColoringStatus.SUCCESS
        assert result_nat.color_count == 2

    def test_invalid_max_colors_raises(self):
        """Non-positive max_colors should raise ValueError."""
        graph = ConflictGraph(["A", "B"])
        with pytest.raises(ValueError, match="positive integer"):
            greedy_coloring(graph, max_colors=0)
        with pytest.raises(ValueError, match="positive integer"):
            greedy_coloring(graph, max_colors=-2)

    def test_unsupported_ordering_raises(self):
        """Unsupported ordering strategy should raise ValueError."""
        graph = ConflictGraph(["A"])
        with pytest.raises(ValueError, match="Unsupported ordering strategy"):
            greedy_coloring(graph, ordering_strategy="random")
