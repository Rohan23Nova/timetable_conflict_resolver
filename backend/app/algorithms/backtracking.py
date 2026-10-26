"""Exact Backtracking K-Coloring algorithm with search limits and diagnostics."""

import time
from typing import Dict, List, Optional, Set

from backend.app.graph.model import ConflictGraph
from backend.app.schemas.models import ColoringResult, ColoringStatus


class ResourceLimitExceeded(Exception):
    """Internal exception raised when node limit or timeout deadline is reached."""

    def __init__(self, reason: str, nodes_explored: int, backtracks: int) -> None:
        super().__init__(reason)
        self.reason = reason
        self.nodes_explored = nodes_explored
        self.backtracks = backtracks


def backtracking_k_coloring(
    graph: ConflictGraph,
    k: int,
    max_nodes: Optional[int] = None,
    timeout_seconds: Optional[float] = None,
    ordering_strategy: str = "descending_degree",
) -> ColoringResult:
    """Find a valid vertex coloring using at most k colors via depth-first backtracking.

    The search traverses vertices in a deterministic order (by default Welsh-Powell
    descending degree with alphabetical tie-breaking). At each step, available colors
    {1, ..., k} are evaluated against assigned neighbors. If a dead end is reached,
    the search backtracks to explore alternative color assignments.

    DISTINCTION BETWEEN INFEASIBILITY AND RESOURCE LIMIT TERMINATION:
    - INFEASIBLE: The search tree was explored exhaustively, mathematically proving that
      no valid assignment exists for the graph with <= k colors.
    - LIMIT_EXCEEDED: The search halted early due to hitting max_nodes or timeout_seconds.
      A valid coloring may or may not exist; the search is incomplete.

    Args:
        graph: The undirected conflict graph.
        k: Maximum number of colors (time slots) permitted. Must be a positive integer.
        max_nodes: Optional maximum number of search nodes (decision points) to explore.
        timeout_seconds: Optional maximum execution time in seconds.
        ordering_strategy: Vertex ordering strategy ('descending_degree' or 'natural').

    Returns:
        ColoringResult: Assignment mapping, color count, status (SUCCESS, INFEASIBLE, or
                        LIMIT_EXCEEDED), completion flag, and detailed performance metadata.

    Raises:
        ValueError: If k is not a positive integer, or if search limit parameters are invalid.
    """
    if not isinstance(k, int) or k <= 0:
        raise ValueError(f"k must be a positive integer, got: {k}")

    if max_nodes is not None and (not isinstance(max_nodes, int) or max_nodes <= 0):
        raise ValueError(f"max_nodes must be a positive integer, got: {max_nodes}")

    if timeout_seconds is not None and timeout_seconds <= 0:
        raise ValueError(f"timeout_seconds must be a positive number, got: {timeout_seconds}")

    start_time = time.perf_counter()

    # Empty graph edge case
    if graph.vertex_count == 0:
        elapsed_ms = (time.perf_counter() - start_time) * 1000.0
        return ColoringResult(
            assignment={},
            color_count=0,
            status=ColoringStatus.SUCCESS,
            is_complete=True,
            metadata={
                "algorithm": "backtracking",
                "k": k,
                "vertex_count": 0,
                "nodes_explored": 0,
                "backtracks": 0,
                "elapsed_time_ms": elapsed_ms,
                "proven_infeasible": False,
            },
        )

    # Deterministic vertex ordering
    if ordering_strategy == "descending_degree":
        ordered_vertices: List[str] = graph.get_ordered_vertices(by_degree=True, descending=True)
    elif ordering_strategy == "natural":
        ordered_vertices = graph.get_ordered_vertices(by_degree=False)
    else:
        raise ValueError(f"Unsupported ordering strategy: '{ordering_strategy}'")

    assignment: Dict[str, int] = {}
    nodes_explored = 0
    backtracks = 0

    def check_limits() -> None:
        if max_nodes is not None and nodes_explored >= max_nodes:
            raise ResourceLimitExceeded("node_limit", nodes_explored, backtracks)
        if timeout_seconds is not None and (time.perf_counter() - start_time) >= timeout_seconds:
            raise ResourceLimitExceeded("timeout", nodes_explored, backtracks)

    def backtrack(idx: int) -> bool:
        nonlocal nodes_explored, backtracks

        if idx == len(ordered_vertices):
            return True

        vertex = ordered_vertices[idx]
        neighbor_colors: Set[int] = {
            assignment[nbr]
            for nbr in graph.get_neighbors(vertex)
            if nbr in assignment
        }

        for color in range(1, k + 1):
            nodes_explored += 1
            check_limits()

            # Neighbor conflict check
            if color not in neighbor_colors:
                assignment[vertex] = color

                if backtrack(idx + 1):
                    return True

                del assignment[vertex]
                backtracks += 1

        return False

    try:
        found_solution = backtrack(0)
    except ResourceLimitExceeded as exc:
        elapsed_ms = (time.perf_counter() - start_time) * 1000.0
        return ColoringResult(
            assignment={},
            color_count=0,
            status=ColoringStatus.LIMIT_EXCEEDED,
            is_complete=False,
            metadata={
                "algorithm": "backtracking",
                "k": k,
                "vertex_count": graph.vertex_count,
                "nodes_explored": exc.nodes_explored,
                "backtracks": exc.backtracks,
                "elapsed_time_ms": elapsed_ms,
                "resource_limit_hit": exc.reason,
                "proven_infeasible": False,
            },
        )

    elapsed_ms = (time.perf_counter() - start_time) * 1000.0

    if found_solution:
        color_count = len(set(assignment.values())) if assignment else 0
        return ColoringResult(
            assignment=dict(assignment),
            color_count=color_count,
            status=ColoringStatus.SUCCESS,
            is_complete=True,
            metadata={
                "algorithm": "backtracking",
                "k": k,
                "vertex_count": graph.vertex_count,
                "nodes_explored": nodes_explored,
                "backtracks": backtracks,
                "elapsed_time_ms": elapsed_ms,
                "proven_infeasible": False,
            },
        )
    else:
        # Search finished exhaustively without finding any valid k-coloring
        return ColoringResult(
            assignment={},
            color_count=0,
            status=ColoringStatus.INFEASIBLE,
            is_complete=False,
            metadata={
                "algorithm": "backtracking",
                "k": k,
                "vertex_count": graph.vertex_count,
                "nodes_explored": nodes_explored,
                "backtracks": backtracks,
                "elapsed_time_ms": elapsed_ms,
                "proven_infeasible": True,
            },
        )
