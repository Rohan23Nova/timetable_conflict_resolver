"""Greedy Graph Coloring algorithm with configurable vertex orderings and color limits."""

import time
from typing import Dict, List, Optional, Set

from backend.app.graph.model import ConflictGraph
from backend.app.schemas.models import ColoringResult, ColoringStatus


def greedy_coloring(
    graph: ConflictGraph,
    ordering_strategy: str = "descending_degree",
    max_colors: Optional[int] = None,
) -> ColoringResult:
    """Perform greedy graph coloring to assign conflict-free time slots (colors).

    Greedy coloring assigns the smallest available color (starting at 1) to each vertex
    in the order determined by `ordering_strategy`.

    LIMITATIONS:
    Greedy coloring is a heuristic algorithm. Its output strongly depends on vertex
    ordering and is NOT guaranteed to find an optimal coloring (i.e. the chromatic
    number chi(G) of the graph). For example, on certain bipartite graphs or crown graphs,
    an unfavorable ordering can result in significantly more colors than necessary.
    However, with Welsh-Powell ordering ('descending_degree'), it guarantees an upper
    bound of max_degree(G) + 1 and performs well in typical university scheduling scenarios.

    Args:
        graph: The undirected conflict graph to color.
        ordering_strategy: Ordering strategy for vertex processing:
            - "descending_degree" (Welsh-Powell): Vertices ordered by descending degree,
              with ties broken deterministically by vertex ID in ascending alphabetical order.
            - "natural": Vertices ordered strictly by vertex ID in ascending alphabetical order.
        max_colors: Optional upper limit on the number of colors allowed. If the greedy
            heuristic requires a color index > max_colors for any vertex, the process halts
            and returns an INCOMPLETE status (not a successful schedule).

    Returns:
        ColoringResult: Object containing the assignment mapping, total colors used,
                        completion status (SUCCESS or INCOMPLETE), and execution metadata.

    Raises:
        ValueError: If ordering_strategy is not recognized, or if max_colors is <= 0.
    """
    if max_colors is not None and max_colors <= 0:
        raise ValueError(f"max_colors must be a positive integer, got: {max_colors}")

    start_time = time.perf_counter()

    # Determine vertex ordering deterministically
    if ordering_strategy == "descending_degree":
        ordered_vertices: List[str] = graph.get_ordered_vertices(by_degree=True, descending=True)
    elif ordering_strategy == "natural":
        ordered_vertices = graph.get_ordered_vertices(by_degree=False)
    else:
        raise ValueError(
            f"Unsupported ordering strategy: '{ordering_strategy}'. "
            "Supported strategies are 'descending_degree' and 'natural'."
        )

    assignment: Dict[str, int] = {}

    # Handle empty graph edge case
    if not ordered_vertices:
        elapsed_ms = (time.perf_counter() - start_time) * 1000.0
        return ColoringResult(
            assignment={},
            color_count=0,
            status=ColoringStatus.SUCCESS,
            is_complete=True,
            metadata={
                "algorithm": "greedy",
                "ordering_strategy": ordering_strategy,
                "vertex_count": 0,
                "elapsed_time_ms": elapsed_ms,
            },
        )

    # Greedily assign the lowest valid color (1-indexed)
    for vertex in ordered_vertices:
        neighbor_colors: Set[int] = {
            assignment[nbr]
            for nbr in graph.get_neighbors(vertex)
            if nbr in assignment
        }

        # Find lowest positive integer not in neighbor_colors
        assigned_color = 1
        while assigned_color in neighbor_colors:
            assigned_color += 1

        # Check against maximum color constraint
        if max_colors is not None and assigned_color > max_colors:
            elapsed_ms = (time.perf_counter() - start_time) * 1000.0
            return ColoringResult(
                assignment=assignment,
                color_count=len(set(assignment.values())) if assignment else 0,
                status=ColoringStatus.INCOMPLETE,
                is_complete=False,
                metadata={
                    "algorithm": "greedy",
                    "ordering_strategy": ordering_strategy,
                    "vertex_count": graph.vertex_count,
                    "failed_at_vertex": vertex,
                    "required_color": assigned_color,
                    "max_colors": max_colors,
                    "elapsed_time_ms": elapsed_ms,
                    "reason": f"Greedy coloring exceeded limit of {max_colors} colors at vertex '{vertex}'.",
                },
            )

        assignment[vertex] = assigned_color

    elapsed_ms = (time.perf_counter() - start_time) * 1000.0
    color_count = len(set(assignment.values())) if assignment else 0

    return ColoringResult(
        assignment=assignment,
        color_count=color_count,
        status=ColoringStatus.SUCCESS,
        is_complete=True,
        metadata={
            "algorithm": "greedy",
            "ordering_strategy": ordering_strategy,
            "vertex_count": graph.vertex_count,
            "elapsed_time_ms": elapsed_ms,
        },
    )
