"""
UrbanPulse - Automated Red-Light OCR Violations Endpoint
"""

from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Violation
from ..schemas import ViolationOut

router = APIRouter(prefix="/api", tags=["Violations"])


@router.get("/violations", response_model=List[ViolationOut])
def get_violations_log(db: Session = Depends(get_db)):
    """
    Returns automated license plate recognition (ALPR) violation records.
    Records are captured when vehicle centroids cross the stop line during active red signals.
    """
    records = db.query(Violation).order_by(Violation.timestamp.desc()).limit(50).all()
    return records
