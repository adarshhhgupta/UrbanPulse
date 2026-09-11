"""
UrbanPulse - Pydantic Validation & Serialization Schemas
"""

from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field, ConfigDict


# ============================================================================
# Detection Schemas
# ============================================================================
class DetectionBase(BaseModel):
    vehicle_class: str
    confidence_score: float = Field(..., ge=0.0, le=1.0)
    bbox_x: float = Field(..., ge=0.0, le=1.0)
    bbox_y: float = Field(..., ge=0.0, le=1.0)
    bbox_w: float = Field(..., ge=0.0, le=1.0)
    bbox_h: float = Field(..., ge=0.0, le=1.0)


class DetectionCreate(DetectionBase):
    pass


class DetectionOut(DetectionBase):
    id: int
    lane_id: int
    timestamp: datetime

    model_config = ConfigDict(from_attributes=True)


# ============================================================================
# Lane Schemas
# ============================================================================
class LaneBase(BaseModel):
    lane_number: int
    current_state: str  # 'red', 'yellow', 'green'
    density_percent: float
    queue_count: int
    is_ambulance_detected: bool


class LaneOut(LaneBase):
    id: int
    last_updated: datetime

    model_config = ConfigDict(from_attributes=True)


class LaneDetailOut(LaneOut):
    detections: List[DetectionOut] = []

    model_config = ConfigDict(from_attributes=True)


# ============================================================================
# Time-Series & Prediction Schemas
# ============================================================================
class DensityHistoryOut(BaseModel):
    id: int
    lane_id: int
    density_percent: float
    recorded_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PredictionPoint(BaseModel):
    timestamp: str
    observed: Optional[float] = None
    predicted: Optional[float] = None


class PredictionSeriesResponse(BaseModel):
    lane_id: int
    lane_number: int
    current_density: float
    trend_description: str
    points: List[PredictionPoint]


# ============================================================================
# Violation Schemas
# ============================================================================
class ViolationOut(BaseModel):
    id: int
    lane_id: int
    plate_number: str
    confidence_score: float
    violation_type: str
    timestamp: datetime

    model_config = ConfigDict(from_attributes=True)


# ============================================================================
# Evaluation Metric Schemas
# ============================================================================
class EvaluationSummary(BaseModel):
    detection_map_05: float
    prediction_rmse_lstm: float
    prediction_rmse_arima: float
    rmse_improvement_percent: float
    wait_time_reduction_percent: float
    ambulance_clearance_time_seconds: float
    validation_methodology: str


# ============================================================================
# Decision Log Schemas
# ============================================================================
class DecisionLogOut(BaseModel):
    id: int
    lane_id: int
    rule_triggered: str
    action_taken: str
    timestamp: datetime

    model_config = ConfigDict(from_attributes=True)


# ============================================================================
# WebSocket Broadcast Schema
# ============================================================================
class SystemSnapshot(BaseModel):
    timestamp: str
    active_emergency: bool
    emergency_lane_id: Optional[int] = None
    emergency_details: Optional[str] = None
    lanes: List[LaneDetailOut]
