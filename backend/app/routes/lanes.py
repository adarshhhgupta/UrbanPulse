"""
UrbanPulse - Lane State, Ingestion, and Prediction Endpoints
Includes dynamic video uploads from PC folder, YOLOv8 inference,
PCU density estimation, demand-responsive signal allocation, and WebSocket telemetry.
"""

import os
import shutil
import json
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Lane, Detection, DensityHistory, DecisionLog
from ..schemas import LaneOut, LaneDetailOut, DetectionCreate, DetectionOut, PredictionSeriesResponse
from ..ml_simulation import calculate_density_from_detections, generate_lstm_forecast
from ..decision_engine import arbitrate_junction_state
from ..video_processor import (
    process_uploaded_video,
    BACKEND_VIDEOS_DIR,
    FRONTEND_VIDEOS_DIR,
    calculate_dynamic_signal_time
)
from .websocket import manager

router = APIRouter(prefix="/api", tags=["Lanes & Predictions"])


def _update_lane_and_arbitrate(lane_id: int, result: dict, db: Session):
    """Updates database models with detection metrics and re-arbitrates signals."""
    lane = db.query(Lane).filter(Lane.id == lane_id).first()
    if not lane:
        return None, None

    lane.density_percent = result["density_percent"]
    lane.queue_count = result["queue_count"]
    lane.is_ambulance_detected = result["is_ambulance_detected"]
    lane.last_updated = datetime.utcnow()

    # Clear prior detections for this lane
    db.query(Detection).filter(Detection.lane_id == lane_id).delete()

    # Find representative detection step (prioritizing emergency vehicle frames if detected)
    rep_detections = []
    if result.get("steps"):
        if result.get("is_ambulance_detected"):
            for step in result["steps"]:
                if any(d.get("vehicle_class") == "ambulance" for d in step.get("detections", [])):
                    rep_detections = step["detections"]
                    break
        if not rep_detections:
            for step in result["steps"]:
                if step.get("detections"):
                    rep_detections = step["detections"]
                    break

    for d in rep_detections:
        db.add(Detection(
            lane_id=lane_id,
            vehicle_class=d["vehicle_class"],
            confidence_score=d["confidence_score"],
            bbox_x=d["bbox_x"],
            bbox_y=d["bbox_y"],
            bbox_w=d["bbox_w"],
            bbox_h=d["bbox_h"],
            timestamp=datetime.utcnow()
        ))

    # Add to density history
    db.add(DensityHistory(
        lane_id=lane_id,
        density_percent=result["density_percent"],
        recorded_at=datetime.utcnow()
    ))
    db.commit()

    # Arbitrate junction signals across all 4 lanes
    all_lanes = db.query(Lane).order_by(Lane.lane_number).all()
    lanes_summary = [
        {
            "id": l.id,
            "lane_number": l.lane_number,
            "density_percent": l.density_percent,
            "queue_count": l.queue_count,
            "is_ambulance_detected": l.is_ambulance_detected,
            "forecast_surge_percent": 23.0 if l.lane_number == 4 else 0.0
        }
        for l in all_lanes
    ]

    decision = arbitrate_junction_state(lanes_summary)
    for l in all_lanes:
        l.current_state = decision["signal_states"].get(l.id, "red")

    d_log = DecisionLog(
        lane_id=decision["active_lane_id"],
        rule_triggered=decision["rule_triggered"],
        action_taken=decision["action_taken"],
        timestamp=datetime.utcnow()
    )
    db.add(d_log)
    db.commit()

    return lane, decision


async def _broadcast_ws_telemetry(db: Session):
    """Pushes instantaneous snapshot to connected WebSockets."""
    if manager.active_connections:
        all_lanes = db.query(Lane).order_by(Lane.lane_number).all()
        lanes_data = []
        has_emergency = False
        emergency_lane = None

        for l in all_lanes:
            if l.is_ambulance_detected:
                has_emergency = True
                emergency_lane = l.id

            dets = [
                {
                    "id": d.id,
                    "lane_id": d.lane_id,
                    "vehicle_class": d.vehicle_class,
                    "confidence_score": d.confidence_score,
                    "bbox_x": d.bbox_x,
                    "bbox_y": d.bbox_y,
                    "bbox_w": d.bbox_w,
                    "bbox_h": d.bbox_h,
                    "timestamp": d.timestamp.isoformat()
                }
                for d in l.detections
            ]

            lanes_data.append({
                "id": l.id,
                "lane_number": l.lane_number,
                "current_state": l.current_state,
                "density_percent": l.density_percent,
                "queue_count": l.queue_count,
                "is_ambulance_detected": l.is_ambulance_detected,
                "last_updated": l.last_updated.isoformat() if l.last_updated else datetime.utcnow().isoformat(),
                "detections": dets
            })

        snapshot = {
            "timestamp": datetime.utcnow().isoformat(),
            "active_emergency": has_emergency,
            "emergency_lane_id": emergency_lane,
            "emergency_details": "Corridor Clearing: Downstream Junction 7 pre-empted." if has_emergency else None,
            "lanes": lanes_data
        }
        await manager.broadcast(json.dumps(snapshot))


# ============================================================================
# READ-ONLY JUNCTION & SIGNAL ENDPOINTS (Explicit Paths First)
# ============================================================================

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


@router.get("/lanes/signal-plan")
def get_signal_plan(db: Session = Depends(get_db)):
    """Returns dynamic green signal durations and priority queue order for all 4 lanes."""
    all_lanes = db.query(Lane).order_by(Lane.lane_number).all()
    lanes_summary = [
        {
            "id": l.id,
            "lane_number": l.lane_number,
            "density_percent": l.density_percent,
            "queue_count": l.queue_count,
            "is_ambulance_detected": l.is_ambulance_detected,
            "forecast_surge_percent": 23.0 if l.lane_number == 4 else 0.0
        }
        for l in all_lanes
    ]
    decision = arbitrate_junction_state(lanes_summary)
    return {
        "active_lane_id": decision["active_lane_id"],
        "rule_triggered": decision["rule_triggered"],
        "action_taken": decision["action_taken"],
        "allocated_green_seconds": decision["allocated_green_seconds"],
        "lane_timings": decision.get("lane_timings", {}),
        "priority_order": decision.get("priority_order", [1, 2, 3, 4]),
        "lanes": [
            {
                "id": l.id,
                "lane_number": l.lane_number,
                "current_state": l.current_state,
                "density_percent": l.density_percent,
                "queue_count": l.queue_count,
                "is_ambulance_detected": l.is_ambulance_detected,
                "allocated_green_seconds": decision.get("lane_timings", {}).get(l.id, 15.0)
            }
            for l in all_lanes
        ]
    }


@router.post("/lanes/upload-all-videos")
async def upload_all_videos(
    lane1: Optional[UploadFile] = File(None),
    lane2: Optional[UploadFile] = File(None),
    lane3: Optional[UploadFile] = File(None),
    lane4: Optional[UploadFile] = File(None),
    ambulance_lane: Optional[int] = Form(None),
    db: Session = Depends(get_db)
):
    """
    Batch uploads up to 4 arbitrary video files from the user's PC across all 4 lanes simultaneously.
    Runs YOLOv8 perception on all feeds and coordinates global junction signal timing.
    """
    uploads = {1: lane1, 2: lane2, 3: lane3, 4: lane4}
    results = {}

    for lane_num, f_upload in uploads.items():
        if f_upload and f_upload.filename:
            backend_dst = os.path.join(BACKEND_VIDEOS_DIR, f"lane{lane_num}.mp4")
            frontend_dst = os.path.join(FRONTEND_VIDEOS_DIR, f"lane{lane_num}.mp4")

            try:
                content = await f_upload.read()
                with open(backend_dst, "wb") as f:
                    f.write(content)
                with open(frontend_dst, "wb") as f:
                    f.write(content)

                is_amb = bool(ambulance_lane == lane_num)
                if is_amb:
                    shutil.copy2(backend_dst, os.path.join(BACKEND_VIDEOS_DIR, "ambulancevid.mp4"))
                    shutil.copy2(backend_dst, os.path.join(FRONTEND_VIDEOS_DIR, "ambulancevid.mp4"))

                res = process_uploaded_video(
                    lane_id=lane_num,
                    video_filepath=backend_dst,
                    original_filename=f_upload.filename,
                    manual_ambulance=is_amb
                )
                results[lane_num] = res
                _update_lane_and_arbitrate(lane_num, res, db)
            except Exception as e:
                results[lane_num] = {"error": str(e)}

    # Final arbitration across all 4 lanes
    all_lanes = db.query(Lane).order_by(Lane.lane_number).all()
    lanes_summary = [
        {
            "id": l.id,
            "lane_number": l.lane_number,
            "density_percent": l.density_percent,
            "queue_count": l.queue_count,
            "is_ambulance_detected": l.is_ambulance_detected,
            "forecast_surge_percent": 23.0 if l.lane_number == 4 else 0.0
        }
        for l in all_lanes
    ]
    decision = arbitrate_junction_state(lanes_summary)
    for l in all_lanes:
        l.current_state = decision["signal_states"].get(l.id, "red")
    db.commit()

    try:
        await _broadcast_ws_telemetry(db)
    except Exception:
        pass

    return {
        "success": True,
        "processed_lanes": list(results.keys()),
        "results": results,
        "decision": decision,
        "lanes": [
            {
                "id": l.id,
                "lane_number": l.lane_number,
                "current_state": l.current_state,
                "density_percent": l.density_percent,
                "queue_count": l.queue_count,
                "is_ambulance_detected": l.is_ambulance_detected,
                "allocated_green_seconds": decision.get("lane_timings", {}).get(l.id, 15.0)
            }
            for l in all_lanes
        ]
    }


@router.post("/lanes/arbitrate")
def trigger_arbitration(db: Session = Depends(get_db)):
    """Forces junction signal re-arbitration based on current vehicle density."""
    all_lanes = db.query(Lane).order_by(Lane.lane_number).all()
    lanes_summary = [
        {
            "id": l.id,
            "lane_number": l.lane_number,
            "density_percent": l.density_percent,
            "queue_count": l.queue_count,
            "is_ambulance_detected": l.is_ambulance_detected,
            "forecast_surge_percent": 23.0 if l.lane_number == 4 else 0.0
        }
        for l in all_lanes
    ]
    decision = arbitrate_junction_state(lanes_summary)
    for l in all_lanes:
        l.current_state = decision["signal_states"].get(l.id, "red")

    d_log = DecisionLog(
        lane_id=decision["active_lane_id"],
        rule_triggered=decision["rule_triggered"],
        action_taken=decision["action_taken"],
        timestamp=datetime.utcnow()
    )
    db.add(d_log)
    db.commit()

    return {
        "decision": decision,
        "lanes": [
            {
                "id": l.id,
                "lane_number": l.lane_number,
                "current_state": l.current_state,
                "density_percent": l.density_percent,
                "queue_count": l.queue_count,
                "is_ambulance_detected": l.is_ambulance_detected,
                "allocated_green_seconds": decision.get("lane_timings", {}).get(l.id, 15.0)
            }
            for l in all_lanes
        ]
    }


@router.post("/lanes/clear-all")
async def clear_all_lanes(db: Session = Depends(get_db)):
    """Resets all 4 junction lanes to clean standby state with zero detections and no emergency."""
    all_lanes = db.query(Lane).all()
    for l in all_lanes:
        l.density_percent = 0.0
        l.queue_count = 0
        l.is_ambulance_detected = False
        l.current_state = "red"
        l.last_updated = datetime.utcnow()
    db.query(Detection).delete()
    db.commit()
    try:
        await _broadcast_ws_telemetry(db)
    except Exception:
        pass
    return {"success": True, "message": "All lane feeds and detections cleared to standby state."}


@router.post("/lanes/reset-defaults")
async def reset_to_reference_defaults(db: Session = Depends(get_db)):
    """Resets junction lanes and detections to the calibrated reference benchmark."""
    defaults = {
        1: {"density": 42.0, "queue": 6, "amb": True, "state": "green"},
        2: {"density": 82.0, "queue": 19, "amb": False, "state": "red"},
        3: {"density": 18.0, "queue": 3, "amb": False, "state": "red"},
        4: {"density": 55.0, "queue": 8, "amb": False, "state": "red"}
    }
    for lane_id, vals in defaults.items():
        l = db.query(Lane).filter(Lane.id == lane_id).first()
        if l:
            l.density_percent = vals["density"]
            l.queue_count = vals["queue"]
            l.is_ambulance_detected = vals["amb"]
            l.current_state = vals["state"]
            l.last_updated = datetime.utcnow()

    db.commit()
    try:
        await _broadcast_ws_telemetry(db)
    except Exception:
        pass

    return {"success": True, "message": "Reset to reference scenario complete."}


# ============================================================================
# PARAMETERIZED LANE ENDPOINTS ({lane_id:int})
# ============================================================================

@router.get("/lanes/{lane_id:int}", response_model=LaneDetailOut)
def get_lane_detail(lane_id: int, db: Session = Depends(get_db)):
    """Returns single lane telemetry and its most recent visual detections."""
    lane = db.query(Lane).filter(Lane.id == lane_id).first()
    if not lane:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Lane with id {lane_id} not found."
        )
    return lane


@router.post("/lanes/{lane_id:int}/upload-video")
async def upload_video_for_lane(
    lane_id: int,
    file: UploadFile = File(...),
    manual_ambulance: bool = Form(False),
    db: Session = Depends(get_db)
):
    """
    Ingests an arbitrary video file uploaded from the user's PC for a specific lane:
    1. Saves video to backend & frontend video streaming paths
    2. Runs YOLOv8 inference across sampled video frames
    3. Computes vehicle queues, PCU density, and demand-responsive green timing
    4. Arbitrates junction signal states and broadcasts real-time telemetry
    """
    lane = db.query(Lane).filter(Lane.id == lane_id).first()
    if not lane:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Lane with id {lane_id} not found."
        )

    # Destination paths
    backend_dst = os.path.join(BACKEND_VIDEOS_DIR, f"lane{lane_id}.mp4")
    frontend_dst = os.path.join(FRONTEND_VIDEOS_DIR, f"lane{lane_id}.mp4")

    # Save uploaded file
    try:
        content = await file.read()
        with open(backend_dst, "wb") as f:
            f.write(content)
        with open(frontend_dst, "wb") as f:
            f.write(content)

        # If ambulance flag indicates emergency, mirror to ambulancevid.mp4
        if manual_ambulance:
            shutil.copy2(backend_dst, os.path.join(BACKEND_VIDEOS_DIR, "ambulancevid.mp4"))
            shutil.copy2(backend_dst, os.path.join(FRONTEND_VIDEOS_DIR, "ambulancevid.mp4"))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed saving uploaded video: {str(e)}"
        )

    # Process video with YOLOv8
    try:
        result = process_uploaded_video(
            lane_id=lane_id,
            video_filepath=backend_dst,
            original_filename=file.filename,
            manual_ambulance=manual_ambulance
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"YOLOv8 video processing failed: {str(e)}"
        )

    # Update database models & arbitrate signals
    updated_lane, decision = _update_lane_and_arbitrate(lane_id, result, db)

    # Push WebSocket telemetry broadcast
    try:
        await _broadcast_ws_telemetry(db)
    except Exception:
        pass

    all_lanes = db.query(Lane).order_by(Lane.lane_number).all()

    return {
        "success": True,
        "message": f"Video '{file.filename}' processed successfully for Lane {lane_id}",
        "lane_id": lane_id,
        "video_metrics": result,
        "decision": decision,
        "all_lanes": [
            {
                "id": l.id,
                "lane_number": l.lane_number,
                "current_state": l.current_state,
                "density_percent": l.density_percent,
                "queue_count": l.queue_count,
                "is_ambulance_detected": l.is_ambulance_detected,
                "allocated_green_seconds": decision.get("lane_timings", {}).get(l.id, 15.0)
            }
            for l in all_lanes
        ]
    }


@router.post("/lanes/{lane_id:int}/detection", response_model=LaneDetailOut)
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

    # 1. Persist incoming detection
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

    # 2. Gather active detections to recompute density
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
    lanes_summary = [
        {
            "id": l.id,
            "lane_number": l.lane_number,
            "density_percent": l.density_percent,
            "queue_count": l.queue_count,
            "is_ambulance_detected": l.is_ambulance_detected,
            "forecast_surge_percent": 23.0 if l.lane_number == 4 else 0.0
        }
        for l in all_lanes
    ]

    decision = arbitrate_junction_state(lanes_summary)
    for l in all_lanes:
        l.current_state = decision["signal_states"].get(l.id, "red")

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


@router.get("/predictions/{lane_id:int}", response_model=PredictionSeriesResponse)
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

    forecast_data = generate_lstm_forecast(
        lane_id=lane.id,
        lane_number=lane.lane_number,
        current_density=lane.density_percent
    )

    return forecast_data
