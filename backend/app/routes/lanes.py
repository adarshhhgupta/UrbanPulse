"""
UrbanPulse - Lane State, Ingestion, and Prediction Endpoints
"""

from typing import List
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Lane, Detection, DensityHistory, DecisionLog
from ..schemas import LaneOut, LaneDetailOut, DetectionCreate, DetectionOut, PredictionSeriesResponse
from ..ml_simulation import calculate_density_from_detections, generate_lstm_forecast
from ..decision_engine import arbitrate_junction_state

router = APIRouter(prefix="/api", tags=["Lanes & Predictions"])


@router.get("/lanes", response_model=List[LaneDetailOut])
def get_all_lanes(db: Session = Depends(get_db)):
    """Returns real-time telemetry state of all 4 monitored junction lanes."""
    lanes = db.query(Lane).order_by(Lane.lane_number).all()
    if not lanes:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No lane configurations found in database. Please seed database."
        )
    return lanes


@router.get("/lanes/{lane_id}", response_model=LaneDetailOut)
def get_lane_detail(lane_id: int, db: Session = Depends(get_db)):
    """Returns single lane telemetry and its most recent visual detections."""
    lane = db.query(Lane).filter(Lane.id == lane_id).first()
    if not lane:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Lane with id {lane_id} not found."
        )
    return lane


@router.post("/lanes/{lane_id}/detection", response_model=LaneDetailOut)
def ingest_detection_event(
    lane_id: int,
    detection_in: DetectionCreate,
    db: Session = Depends(get_db)
):
    """
    Simulates / ingests a raw YOLOv8 bounding box detection event.
    Persists detection, re-evaluates density and priority arbitration,
    and updates global junction signal heads accordingly.
    """
    lane = db.query(Lane).filter(Lane.id == lane_id).first()
    if not lane:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Lane with id {lane_id} not found."
        )

    # 1. Persist the incoming detection
    new_det = Detection(
        lane_id=lane_id,
        vehicle_class=detection_in.vehicle_class,
        confidence_score=detection_in.confidence_score,
        bbox_x=detection_in.bbox_x,
        bbox_y=detection_in.bbox_y,
        bbox_w=detection_in.bbox_w,
        bbox_h=detection_in.bbox_h,
        timestamp=datetime.utcnow()
    )
    db.add(new_det)
    db.commit()

    # 2. Gather active detections for this lane to re-compute density
    active_dets = db.query(Detection).filter(Detection.lane_id == lane_id).all()
    det_dicts = [
        {"vehicle_class": d.vehicle_class, "confidence_score": d.confidence_score}
        for d in active_dets
    ]

    density, q_count, has_ambulance = calculate_density_from_detections(det_dicts)
    lane.density_percent = density
    lane.queue_count = q_count
    lane.is_ambulance_detected = has_ambulance
    lane.last_updated = datetime.utcnow()

    # Log to density history
    history_entry = DensityHistory(
        lane_id=lane_id,
        density_percent=density,
        recorded_at=datetime.utcnow()
    )
    db.add(history_entry)
    db.commit()

    # 3. Arbitrate junction signals across all 4 lanes
    all_lanes = db.query(Lane).order_by(Lane.lane_number).all()
    lanes_summary = []
    for l in all_lanes:
        lanes_summary.append({
            "id": l.id,
            "lane_number": l.lane_number,
            "density_percent": l.density_percent,
            "queue_count": l.queue_count,
            "is_ambulance_detected": l.is_ambulance_detected,
            "forecast_surge_percent": 23.0 if l.lane_number == 4 else 0.0
        })

    decision = arbitrate_junction_state(lanes_summary)

    # Apply arbitrated signal states
    for l in all_lanes:
        new_state = decision["signal_states"].get(l.id, "red")
        l.current_state = new_state

    # Log decision event
    d_log = DecisionLog(
        lane_id=decision["active_lane_id"],
        rule_triggered=decision["rule_triggered"],
        action_taken=decision["action_taken"],
        timestamp=datetime.utcnow()
    )
    db.add(d_log)
    db.commit()
    db.refresh(lane)

    return lane


@router.get("/predictions/{lane_id}", response_model=PredictionSeriesResponse)
def get_lane_predictions(lane_id: int, db: Session = Depends(get_db)):
    """
    Returns 30-minute historical observed density alongside
    10-minute multi-horizon LSTM forecasting for the requested lane.
    """
    lane = db.query(Lane).filter(Lane.id == lane_id).first()
    if not lane:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Lane with id {lane_id} not found."
        )

    # Generate synthetic LSTM continuation based on active density
    forecast_data = generate_lstm_forecast(
        lane_id=lane.id,
        lane_number=lane.lane_number,
        current_density=lane.density_percent
    )

    return forecast_data
