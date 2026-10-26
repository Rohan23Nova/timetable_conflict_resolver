"""API router for sample dataset ingestion and initialization."""

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.schemas.sample_data import (
    SampleDataLoadRequest,
    SampleDataSummaryResponse,
)
from backend.app.services.sample_data_service import SampleDataService

router = APIRouter(prefix="/sample-data", tags=["Sample Data"])


@router.post(
    "",
    response_model=SampleDataSummaryResponse,
    status_code=status.HTTP_200_OK,
    summary="Load sample academic dataset",
    description="Loads a synthetic university dataset of 10 examinations and 20 students. Safe against silent overwrites unless reset=True.",
)
def load_sample_dataset(
    request: SampleDataLoadRequest = SampleDataLoadRequest(),
    db: Session = Depends(get_db),
) -> SampleDataSummaryResponse:
    """Load sample dataset."""
    return SampleDataService.load_sample_data(db, request)


@router.post(
    "/load",
    response_model=SampleDataSummaryResponse,
    status_code=status.HTTP_200_OK,
    summary="Alias to load sample academic dataset",
    description="Convenience route for POST /api/sample-data",
)
def load_sample_dataset_alias(
    request: SampleDataLoadRequest = SampleDataLoadRequest(),
    db: Session = Depends(get_db),
) -> SampleDataSummaryResponse:
    """Alias for loading sample dataset."""
    return SampleDataService.load_sample_data(db, request)
