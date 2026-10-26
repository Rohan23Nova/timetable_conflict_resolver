"""Independent schedule validator for conflict graph coloring assignments."""

from typing import Any, Dict, List, Optional, Set, Tuple

from backend.app.graph.model import ConflictGraph
from backend.app.schemas.models import ValidationReport


def validate_schedule(
    graph: ConflictGraph,
    assignment: Dict[str, Any],
    max_colors: Optional[int] = None,
    allowed_colors: Optional[Set[int]] = None,
) -> ValidationReport:
    """Independently validate a proposed examination schedule (color assignment).

    This validator does not trust any algorithm's self-reported status. It performs
    exhaustive checks on:
    1. Unknown examinations (items in assignment not in the graph).
    2. Missing examinations (vertices in graph missing from assignment).
    3. Invalid color values (non-integers, booleans, non-positive numbers).
    4. Out-of-range colors (colors exceeding max_colors or not in allowed_colors).
    5. Conflicting assignments (adjacent examinations sharing the same time slot).

    Args:
        graph: The ground-truth conflict graph.
        assignment: Mapping from examination ID to assigned color / time slot.
        max_colors: Optional upper bound on permitted color index (e.g., number of available slots).
        allowed_colors: Optional explicit set of valid color indices.

    Returns:
        ValidationReport: Structured report detailing validity, all detected errors,
                          conflicts, and metadata.
    """
    errors: List[str] = []
    checks_performed: List[str] = [
        "check_unknown_examinations",
        "check_missing_examinations",
        "check_color_validity",
        "check_color_range",
        "check_conflicts",
    ]

    unknown_examinations: List[str] = []
    missing_examinations: List[str] = []
    invalid_color_values: List[Tuple[str, Any]] = []
    out_of_range_colors: List[Tuple[str, int]] = []
    conflicts: List[Tuple[str, str, int]] = []

    # 1. Unknown examinations
    for exam in sorted(assignment.keys()):
        if not graph.has_vertex(exam):
            unknown_examinations.append(exam)
            errors.append(
                f"Unknown examination '{exam}' in assignment is not present in conflict graph."
            )

    # 2. Missing examinations (incomplete schedule)
    for exam in graph.vertices:
        if exam not in assignment:
            missing_examinations.append(exam)
            errors.append(
                f"Missing examination: '{exam}' exists in graph but was not assigned a slot."
            )

    # 3. Invalid color values
    for exam in sorted(assignment.keys()):
        color = assignment[exam]
        # In Python bool is a subclass of int (isinstance(True, int) is True), check specifically
        if isinstance(color, bool) or not isinstance(color, int) or color <= 0:
            invalid_color_values.append((exam, color))
            errors.append(
                f"Invalid color for examination '{exam}': {color!r}. "
                "Time slots must be positive integers (1, 2, ...)."
            )

    # 4. Out of range colors
    for exam in sorted(assignment.keys()):
        color = assignment[exam]
        if isinstance(color, int) and not isinstance(color, bool):
            if max_colors is not None and color > max_colors:
                out_of_range_colors.append((exam, color))
                errors.append(
                    f"Color out of range for examination '{exam}': slot {color} "
                    f"exceeds maximum allowed slots ({max_colors})."
                )
            if allowed_colors is not None and color not in allowed_colors:
                out_of_range_colors.append((exam, color))
                errors.append(
                    f"Color not allowed for examination '{exam}': slot {color} "
                    f"is not in permitted slots {sorted(allowed_colors)}."
                )

    # 5. Conflict checks: adjacent vertices cannot share colors
    for u, v in graph.get_edges():
        if u in assignment and v in assignment:
            color_u = assignment[u]
            color_v = assignment[v]
            # Only compare if both are valid integers
            if (
                isinstance(color_u, int)
                and not isinstance(color_u, bool)
                and isinstance(color_v, int)
                and not isinstance(color_v, bool)
            ):
                if color_u == color_v:
                    conflicts.append((u, v, color_u))
                    errors.append(
                        f"Conflict violation: adjacent examinations '{u}' and '{v}' "
                        f"are both assigned time slot {color_u}."
                    )

    is_valid = len(errors) == 0

    return ValidationReport(
        is_valid=is_valid,
        errors=errors,
        checks_performed=checks_performed,
        conflicts=conflicts,
        missing_examinations=missing_examinations,
        unknown_examinations=unknown_examinations,
        invalid_color_values=invalid_color_values,
        out_of_range_colors=out_of_range_colors,
        metadata={
            "graph_vertices": graph.vertex_count,
            "graph_edges": graph.edge_count,
            "assignment_size": len(assignment),
            "max_colors_constraint": max_colors,
        },
    )
