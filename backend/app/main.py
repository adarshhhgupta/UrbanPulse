"""
UrbanPulse - Smart Traffic Management System Backend
Entry point for the FastAPI server, database initialization, route mounting,
and periodic background simulation streaming via WebSockets.
"""

import asyncio
import json
import logging
from contextlib import asynccontextmanager
from datetime import datetime

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from .database import engine, SessionLocal, Base
from .models import Lane, Detection, DensityHistory, Prediction, Violation, EvaluationMetric, DecisionLog
from .routes import lanes, violations, evaluation, websocket
from .routes.websocket import manager

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("UrbanPulse")


import time

def initialize_and_seed_db(max_retries: int = 15, retry_interval: float = 2.0):
    """Initializes tables and populates Reference Scenario seed data if empty with retry logic."""
    for attempt in range(1, max_retries + 1):
        try:
            logger.info(f"Connecting to database (attempt {attempt}/{max_retries})...")
            Base.metadata.create_all(bind=engine)
            break
        except Exception as e:
            if attempt == max_retries:
                logger.error(f"Failed to connect to database after {max_retries} attempts: {e}")
                raise e
            logger.warning(f"Database connection attempt {attempt}/{max_retries} failed: {e}. Retrying in {retry_interval}s...")
            time.sleep(retry_interval)

    db: Session = SessionLocal()
    try:
        existing_lanes = db.query(Lane).count()
        if existing_lanes == 0:
            logger.info("Database empty. Seeding Reference Scenario...")
            # 1. Seed Lanes
            l1 = Lane(id=1, lane_number=1, current_state="green", density_percent=42.0, queue_count=6, is_ambulance_detected=True)
            l2 = Lane(id=2, lane_number=2, current_state="red", density_percent=82.0, queue_count=19, is_ambulance_detected=False)
            l3 = Lane(id=3, lane_number=3, current_state="red", density_percent=18.0, queue_count=3, is_ambulance_detected=False)
            l4 = Lane(id=4, lane_number=4, current_state="red", density_percent=55.0, queue_count=8, is_ambulance_detected=False)
            db.add_all([l1, l2, l3, l4])
            db.commit()

            # 2. Seed Real YOLOv8 Vehicle Detections
            d1 = Detection(lane_id=1, vehicle_class="ambulance", confidence_score=0.98, bbox_x=0.060, bbox_y=0.445, bbox_w=0.134, bbox_h=0.475)
            d2 = Detection(lane_id=1, vehicle_class="car", confidence_score=0.94, bbox_x=0.546, bbox_y=0.644, bbox_w=0.113, bbox_h=0.193)
            d3 = Detection(lane_id=1, vehicle_class="car", confidence_score=0.92, bbox_x=0.778, bbox_y=0.656, bbox_w=0.117, bbox_h=0.162)

            d4 = Detection(lane_id=2, vehicle_class="bus", confidence_score=0.92, bbox_x=0.485, bbox_y=0.410, bbox_w=0.065, bbox_h=0.185)
            d5 = Detection(lane_id=2, vehicle_class="car", confidence_score=0.94, bbox_x=0.245, bbox_y=0.535, bbox_w=0.075, bbox_h=0.125)
            d6 = Detection(lane_id=2, vehicle_class="auto-rickshaw", confidence_score=0.91, bbox_x=0.380, bbox_y=0.450, bbox_w=0.055, bbox_h=0.095)
            d7 = Detection(lane_id=2, vehicle_class="bike", confidence_score=0.89, bbox_x=0.280, bbox_y=0.650, bbox_w=0.040, bbox_h=0.090)

            d8 = Detection(lane_id=3, vehicle_class="bus", confidence_score=0.96, bbox_x=0.209, bbox_y=0.610, bbox_w=0.214, bbox_h=0.381)
            d9 = Detection(lane_id=3, vehicle_class="car", confidence_score=0.91, bbox_x=0.483, bbox_y=0.320, bbox_w=0.063, bbox_h=0.147)
            d10 = Detection(lane_id=3, vehicle_class="car", confidence_score=0.89, bbox_x=0.445, bbox_y=0.246, bbox_w=0.059, bbox_h=0.116)

            d11 = Detection(lane_id=4, vehicle_class="car", confidence_score=0.96, bbox_x=0.488, bbox_y=0.410, bbox_w=0.191, bbox_h=0.248)
            d12 = Detection(lane_id=4, vehicle_class="auto-rickshaw", confidence_score=0.94, bbox_x=0.000, bbox_y=0.430, bbox_w=0.249, bbox_h=0.357)
            d13 = Detection(lane_id=4, vehicle_class="auto-rickshaw", confidence_score=0.92, bbox_x=0.220, bbox_y=0.378, bbox_w=0.212, bbox_h=0.275)
            d14 = Detection(lane_id=4, vehicle_class="auto-rickshaw", confidence_score=0.90, bbox_x=0.656, bbox_y=0.362, bbox_w=0.070, bbox_h=0.176)
            db.add_all([d1, d2, d3, d4, d5, d6, d7, d8, d9, d10, d11, d12, d13, d14])

            # 3. Seed Violations
            v1 = Violation(lane_id=2, plate_number="KA-05-MJ-4821", confidence_score=0.948, violation_type="Red-Light Stop-Line Breach")
            v2 = Violation(lane_id=3, plate_number="DL-01-AB-1204", confidence_score=0.962, violation_type="Red-Light Stop-Line Breach")
            v3 = Violation(lane_id=2, plate_number="MH-12-TR-9082", confidence_score=0.921, violation_type="Full Junction Traversal on Red")
            v4 = Violation(lane_id=4, plate_number="TN-09-BK-3319", confidence_score=0.954, violation_type="Red-Light Stop-Line Breach")
            v5 = Violation(lane_id=3, plate_number="HR-26-DK-7711", confidence_score=0.916, violation_type="Illegal Left Turn on Red")
            v6 = Violation(lane_id=1, plate_number="KA-03-HA-5542", confidence_score=0.973, violation_type="Red-Light Stop-Line Breach")
            db.add_all([v1, v2, v3, v4, v5, v6])

            # 4. Seed Evaluation Metrics
            m1 = EvaluationMetric(metric_name="detection_map_05", value=91.3, unit="%")
            m2 = EvaluationMetric(metric_name="prediction_rmse_lstm", value=3.2, unit="%")
            m3 = EvaluationMetric(metric_name="prediction_rmse_arima", value=7.8, unit="%")
            m4 = EvaluationMetric(metric_name="wait_time_reduction_percent", value=27.4, unit="%")
            m5 = EvaluationMetric(metric_name="ambulance_clearance_time_seconds", value=8.2, unit="seconds")
            db.add_all([m1, m2, m3, m4, m5])

            # 5. Seed Decision Log
            log1 = DecisionLog(
                lane_id=1,
                rule_triggered="emergency",
                action_taken="Forced Lane 1 GREEN (Ambulance detected). Opposing lanes locked to RED. Downstream Junction 7 notified."
            )
            db.add(log1)

            db.commit()
            logger.info("Seed data successfully committed.")
    except Exception as e:
        logger.error(f"Error seeding database: {e}")
        db.rollback()
    finally:
        db.close()


async def background_simulation_broadcaster():
    """
    Background worker that broadcasts real-time lane state snapshots
    every 3.5 seconds to all connected WebSocket clients.
    """
    logger.info("Starting background WebSocket telemetry task...")
    while True:
        try:
            await asyncio.sleep(3.5)
            if manager.active_connections:
                db: Session = SessionLocal()
                try:
                    lanes_query = db.query(Lane).order_by(Lane.lane_number).all()
                    lanes_data = []
                    has_emergency = False
                    emergency_lane = None

                    for l in lanes_query:
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
                finally:
                    db.close()
        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.error(f"Error in telemetry broadcast loop: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    initialize_and_seed_db()
    task = asyncio.create_task(background_simulation_broadcaster())
    yield
    # Shutdown
    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        pass


app = FastAPI(
    title="UrbanPulse",
    description="AI-powered 4-lane junction control with ambulance priority and predictive signal timing",
    version="1.0.0",
    lifespan=lifespan
)

# Enable CORS for local Vite and production frontend origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount application routers
app.include_router(lanes.router)
app.include_router(violations.router)
app.include_router(evaluation.router)
app.include_router(websocket.router)


@app.get("/")
def root():
    return {
        "app": "UrbanPulse",
        "tagline": "AI-powered 4-lane junction control with ambulance priority and predictive signal timing",
        "status": "online",
        "docs_url": "/docs",
        "api_endpoints": [
            "/api/lanes",
            "/api/lanes/{id}",
            "/api/lanes/{id}/detection",
            "/api/predictions/{lane_id}",
            "/api/violations",
            "/api/evaluation",
            "/ws/lanes"
        ]
    }
