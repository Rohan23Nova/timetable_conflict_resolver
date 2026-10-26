"""Undirected conflict graph data structure for examination scheduling."""

from typing import Dict, Iterable, List, Set, Tuple


class GraphError(Exception):
    """Base exception for graph-related errors."""
    pass


class SelfLoopError(GraphError, ValueError):
    """Raised when an edge attempts to connect a vertex to itself."""
    pass


class VertexNotFoundError(GraphError, KeyError):
    """Raised when an operation targets a vertex not present in the graph."""
    pass


class ConflictGraph:
    """An undirected graph representing examinations and scheduling conflicts.

    Vertices represent examinations. An undirected edge between two examinations
    indicates a conflict (e.g., at least one student is enrolled in both).
    Adjacency is represented using sets to guarantee efficient O(1) neighbor lookups
    and edge additions.
    """

    def __init__(self, vertices: Iterable[str] | None = None) -> None:
        """Initialize an undirected conflict graph with optional initial vertices."""
        self._adj: Dict[str, Set[str]] = {}
        if vertices is not None:
            self.add_vertices(vertices)

    @property
    def vertex_count(self) -> int:
        """Return the total number of vertices in the graph."""
        return len(self._adj)

    @property
    def edge_count(self) -> int:
        """Return the number of unique undirected edges in the graph."""
        total_degree = sum(len(neighbors) for neighbors in self._adj.values())
        return total_degree // 2

    @property
    def vertices(self) -> List[str]:
        """Return a deterministically sorted list of all vertex IDs."""
        return sorted(self._adj.keys())

    def has_vertex(self, vertex: str) -> bool:
        """Check whether a vertex exists in the graph."""
        return vertex in self._adj

    def add_vertex(self, vertex: str) -> None:
        """Add a vertex to the graph if not already present.

        Isolated vertices are retained with an empty neighbor set.
        """
        if not isinstance(vertex, str):
            vertex = str(vertex)
        if vertex not in self._adj:
            self._adj[vertex] = set()

    def add_vertices(self, vertices: Iterable[str]) -> None:
        """Add multiple vertices to the graph."""
        for vertex in vertices:
            self.add_vertex(vertex)

    def add_edge(self, u: str, v: str) -> None:
        """Add a symmetric, undirected edge between vertex u and vertex v.

        Raises:
            SelfLoopError: If u and v represent the same vertex.
            VertexNotFoundError: If either u or v does not exist in the graph.
        """
        if not isinstance(u, str):
            u = str(u)
        if not isinstance(v, str):
            v = str(v)

        if u == v:
            raise SelfLoopError(f"Self-loops are not permitted in a conflict graph: '{u}' -> '{v}'")

        if u not in self._adj:
            raise VertexNotFoundError(f"Cannot add edge: Vertex '{u}' does not exist in graph.")
        if v not in self._adj:
            raise VertexNotFoundError(f"Cannot add edge: Vertex '{v}' does not exist in graph.")

        # Symmetric addition: duplicate edges are naturally ignored by set semantics
        self._adj[u].add(v)
        self._adj[v].add(u)

    def has_edge(self, u: str, v: str) -> bool:
        """Check if an undirected edge exists between vertex u and vertex v."""
        if u not in self._adj or v not in self._adj:
            return False
        return v in self._adj[u]

    def get_neighbors(self, vertex: str) -> Set[str]:
        """Return a copy of the neighbor set for the given vertex.

        Raises:
            VertexNotFoundError: If the vertex does not exist in the graph.
        """
        if vertex not in self._adj:
            raise VertexNotFoundError(f"Vertex '{vertex}' does not exist in graph.")
        return set(self._adj[vertex])

    def get_sorted_neighbors(self, vertex: str) -> List[str]:
        """Return deterministically sorted neighbor IDs for the given vertex.

        Raises:
            VertexNotFoundError: If the vertex does not exist in the graph.
        """
        return sorted(self.get_neighbors(vertex))

    def get_degree(self, vertex: str) -> int:
        """Return the degree (number of conflicting neighbors) for the given vertex.

        Raises:
            VertexNotFoundError: If the vertex does not exist in the graph.
        """
        if vertex not in self._adj:
            raise VertexNotFoundError(f"Vertex '{vertex}' does not exist in graph.")
        return len(self._adj[vertex])

    def get_edges(self) -> List[Tuple[str, str]]:
        """Return a deterministically sorted list of unique undirected edges as (u, v) with u < v."""
        edges: List[Tuple[str, str]] = []
        for u in sorted(self._adj.keys()):
            for v in sorted(self._adj[u]):
                if u < v:
                    edges.append((u, v))
        return edges

    def get_ordered_vertices(
        self, by_degree: bool = False, descending: bool = True
    ) -> List[str]:
        """Return vertices deterministically.

        If by_degree is True, vertices are ordered primarily by degree (descending if
        descending=True) and tie-broken by vertex ID in ascending alphabetical order.
        """
        if not by_degree:
            return self.vertices

        # Primary key: degree (negated if descending), Secondary key: vertex ID ascending
        return sorted(
            self._adj.keys(),
            key=lambda v: (-len(self._adj[v]) if descending else len(self._adj[v]), v),
        )

    def __len__(self) -> int:
        return self.vertex_count

    def __contains__(self, vertex: str) -> bool:
        return self.has_vertex(vertex)

    def __repr__(self) -> str:
        return f"ConflictGraph(vertices={self.vertex_count}, edges={self.edge_count})"

    def __eq__(self, other: object) -> bool:
        if not isinstance(other, ConflictGraph):
            return False
        return self._adj == other._adj
