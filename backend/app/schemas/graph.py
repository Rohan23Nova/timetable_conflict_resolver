"""Pydantic schemas for Conflict Graph representation and API responses."""

from typing import Dict, List, Optional
from pydantic import BaseModel, Field


class GraphVertex(BaseModel):
    """Represents an examination vertex in the conflict graph."""

    id: str = Field(..., description="Internal examination UUID")
    code: str = Field(..., description="Unique course/exam code, e.g. 'CS101'")
    name: str = Field(..., description="Examination course title")
    department: Optional[str] = Field(default=None, description="Academic department")
    semester: Optional[str] = Field(default=None, description="Academic semester")
    degree: int = Field(default=0, description="Number of conflicting examinations")


class GraphEdge(BaseModel):
    """Represents a conflict between two examinations sharing enrolled students."""

    source: str = Field(..., description="Source examination code")
    target: str = Field(..., description="Target examination code")
    weight: int = Field(default=1, description="Number of concurrent students causing this conflict")
    shared_students: List[str] = Field(
        default_factory=list,
        description="Institutional IDs of students concurrently enrolled in both examinations",
    )


class ConflictGraphResponse(BaseModel):
    """Structured graph representation of persistent timetable conflicts."""

    vertex_count: int = Field(..., description="Total number of examinations in graph")
    edge_count: int = Field(..., description="Total unique undirected conflict edges")
    vertices: List[GraphVertex] = Field(..., description="List of examination vertices")
    edges: List[GraphEdge] = Field(..., description="List of conflict edges")
    degrees: Dict[str, int] = Field(
        ..., description="Mapping from examination code to degree (conflict count)"
    )
    isolated_examinations: List[str] = Field(
        default_factory=list,
        description="List of examination codes having zero conflicts (degree 0)",
    )
    adjacency: Dict[str, List[str]] = Field(
        default_factory=dict,
        description="Adjacency list mapping each exam code to its conflicting neighbor codes",
    )
