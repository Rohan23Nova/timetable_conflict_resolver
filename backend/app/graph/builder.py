"""Builder functions to construct conflict graphs from examination and enrolment records."""

from collections import defaultdict
from itertools import combinations
from typing import Any, Dict, Iterable, List, Set, Tuple, Union

from backend.app.graph.model import ConflictGraph
from backend.app.schemas.models import Enrolment, Exam


class BuilderError(Exception):
    """Base exception for graph building errors."""
    pass


class UnknownExamReferenceError(BuilderError, ValueError):
    """Raised when an enrolment references an examination not present in the catalog."""
    pass


def _extract_exam_id(exam_item: Union[str, Exam, Dict[str, Any]]) -> str:
    """Normalize and extract examination ID from supported item types."""
    if isinstance(exam_item, Exam):
        exam_id = exam_item.id
    elif isinstance(exam_item, dict):
        if "id" not in exam_item:
            raise ValueError(f"Invalid examination dict missing 'id': {exam_item}")
        exam_id = str(exam_item["id"])
    elif isinstance(exam_item, str):
        exam_id = exam_item.strip()
    else:
        raise ValueError(f"Unsupported examination item type: {type(exam_item)}")

    if not exam_id:
        raise ValueError("Examination ID cannot be empty.")
    return exam_id


def _extract_enrolment(
    enrolment_item: Union[Enrolment, Tuple[str, str], List[str], Dict[str, Any]]
) -> Tuple[str, str]:
    """Normalize and extract (student_id, exam_id) tuple from supported enrolment types."""
    if isinstance(enrolment_item, Enrolment):
        return enrolment_item.student_id.strip(), enrolment_item.exam_id.strip()
    elif isinstance(enrolment_item, (tuple, list)):
        if len(enrolment_item) != 2:
            raise ValueError(f"Enrolment tuple must contain exactly (student_id, exam_id): {enrolment_item}")
        return str(enrolment_item[0]).strip(), str(enrolment_item[1]).strip()
    elif isinstance(enrolment_item, dict):
        if "student_id" not in enrolment_item or "exam_id" not in enrolment_item:
            raise ValueError(f"Enrolment dict must contain 'student_id' and 'exam_id': {enrolment_item}")
        return str(enrolment_item["student_id"]).strip(), str(enrolment_item["exam_id"]).strip()
    else:
        raise ValueError(f"Unsupported enrolment item type: {type(enrolment_item)}")


def build_conflict_graph(
    examinations: Iterable[Union[str, Exam, Dict[str, Any]]],
    enrolments: Union[
        Iterable[Union[Enrolment, Tuple[str, str], List[str], Dict[str, Any]]],
        Dict[str, Iterable[str]],
    ],
) -> ConflictGraph:
    """Build an undirected conflict graph from examination records and student enrolments.

    Every distinct examination is registered as a vertex in the graph, even if it has no
    students registered (isolated vertex). For every pair of distinct examinations sharing
    at least one registered student, exactly one undirected conflict edge is created.

    Args:
        examinations: Iterable of examination IDs, Exam schemas, or dictionaries with 'id'.
        enrolments: Either an iterable of Enrolments/tuples/dicts or a mapping of
                    student_id -> iterable of exam_ids.

    Returns:
        ConflictGraph: The populated undirected conflict graph.

    Raises:
        UnknownExamReferenceError: If an enrolment references an exam ID that was not
                                    included in the examinations catalog.
        ValueError: If record items are malformed or invalid.
    """
    graph = ConflictGraph()

    # Register all known examinations
    for exam_item in examinations:
        exam_id = _extract_exam_id(exam_item)
        graph.add_vertex(exam_id)

    # Group enrolments by student, eliminating duplicate student-exam enrolments
    student_exams: Dict[str, Set[str]] = defaultdict(set)

    if isinstance(enrolments, dict):
        for student_id, exam_list in enrolments.items():
            s_id = str(student_id).strip()
            for e in exam_list:
                e_id = str(e).strip()
                if not graph.has_vertex(e_id):
                    raise UnknownExamReferenceError(
                        f"Enrolment for student '{s_id}' references unknown examination '{e_id}'."
                    )
                student_exams[s_id].add(e_id)
    else:
        for enr_item in enrolments:
            s_id, e_id = _extract_enrolment(enr_item)
            if not graph.has_vertex(e_id):
                raise UnknownExamReferenceError(
                    f"Enrolment for student '{s_id}' references unknown examination '{e_id}'."
                )
            student_exams[s_id].add(e_id)

    # Create pairwise conflict edges for students enrolled in multiple exams
    for _, exam_set in student_exams.items():
        if len(exam_set) > 1:
            sorted_exams = sorted(exam_set)
            for u, v in combinations(sorted_exams, 2):
                if not graph.has_edge(u, v):
                    graph.add_edge(u, v)

    return graph
