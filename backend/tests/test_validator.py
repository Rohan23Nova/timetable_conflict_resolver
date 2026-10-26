"""Tests for independent schedule validator."""

from backend.app.graph.model import ConflictGraph
from backend.app.validation.validator import validate_schedule


class TestScheduleValidator:
    """Test suite for independent schedule validator."""

    def test_validator_accepts_valid_assignment(self):
        """Validator should accept a complete, conflict-free assignment within bounds."""
        graph = ConflictGraph(["A", "B", "C"])
        graph.add_edge("A", "B")
        graph.add_edge("B", "C")
        graph.add_edge("A", "C")

        assignment = {"A": 1, "B": 2, "C": 3}
        report = validate_schedule(graph, assignment, max_colors=3)

        assert report.is_valid is True
        assert len(report.errors) == 0
        assert len(report.conflicts) == 0
        assert len(report.missing_examinations) == 0
        assert len(report.unknown_examinations) == 0
        assert len(report.invalid_color_values) == 0
        assert len(report.out_of_range_colors) == 0
        assert "check_conflicts" in report.checks_performed

    def test_validator_detects_missing_examinations(self):
        """Validator must report missing examinations when assignment is incomplete."""
        graph = ConflictGraph(["A", "B", "C"])
        assignment = {"A": 1, "B": 2}  # C is missing

        report = validate_schedule(graph, assignment)
        assert report.is_valid is False
        assert "C" in report.missing_examinations
        assert any("Missing examination: 'C'" in err for err in report.errors)

    def test_validator_detects_unknown_examinations(self):
        """Validator must report examinations in assignment that do not exist in graph."""
        graph = ConflictGraph(["A", "B"])
        assignment = {"A": 1, "B": 2, "GHOST_EXAM": 3}

        report = validate_schedule(graph, assignment)
        assert report.is_valid is False
        assert "GHOST_EXAM" in report.unknown_examinations
        assert any("Unknown examination 'GHOST_EXAM'" in err for err in report.errors)

    def test_validator_detects_conflicting_assignments(self):
        """Validator must detect when adjacent examinations share the same time slot."""
        graph = ConflictGraph(["A", "B", "C"])
        graph.add_edge("A", "B")  # A and B conflict

        assignment = {"A": 1, "B": 1, "C": 2}  # A and B both given 1
        report = validate_schedule(graph, assignment)

        assert report.is_valid is False
        assert len(report.conflicts) == 1
        assert report.conflicts[0] == ("A", "B", 1)
        assert any("Conflict violation" in err for err in report.errors)

    def test_validator_detects_invalid_color_values(self):
        """Validator must flag non-integer, boolean, or <= 0 color values."""
        graph = ConflictGraph(["A", "B", "C", "D"])
        assignment = {
            "A": 0,       # Zero (invalid)
            "B": -2,      # Negative (invalid)
            "C": "slot1", # String (invalid)
            "D": True,    # Boolean (invalid, even though bool subclasses int)
        }

        report = validate_schedule(graph, assignment)
        assert report.is_valid is False
        assert len(report.invalid_color_values) == 4
        invalid_exams = {item[0] for item in report.invalid_color_values}
        assert invalid_exams == {"A", "B", "C", "D"}

    def test_validator_detects_colors_outside_permitted_range(self):
        """Validator must flag colors exceeding max_colors or not in allowed_colors."""
        graph = ConflictGraph(["A", "B"])
        assignment = {"A": 1, "B": 4}

        # Test max_colors
        report = validate_schedule(graph, assignment, max_colors=3)
        assert report.is_valid is False
        assert ("B", 4) in report.out_of_range_colors
        assert any("exceeds maximum allowed slots" in err for err in report.errors)

        # Test allowed_colors
        report_allowed = validate_schedule(graph, assignment, allowed_colors={1, 2})
        assert report_allowed.is_valid is False
        assert ("B", 4) in report_allowed.out_of_range_colors
        assert any("is not in permitted slots" in err for err in report_allowed.errors)

    def test_validator_empty_graph_and_assignment(self):
        """An empty graph with an empty assignment should be valid."""
        graph = ConflictGraph()
        report = validate_schedule(graph, {})
        assert report.is_valid is True
        assert len(report.errors) == 0
