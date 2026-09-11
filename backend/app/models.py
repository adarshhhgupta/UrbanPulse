"""
UrbanPulse - SQLAlchemy Database Models (PostgreSQL)
Maps 7 domain entities: lanes, detections, density_history, predictions, violations, evaluation_metrics, decision_log.
"""

from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from .database import Base


def utc_now():
    return datetime.now(timezone.utc)


class Lane(Base):
    __tablename__ = "lanes"

    id = Column(Integer, primary_key=True, index=True)
    lane_number = Column(Integer, unique=True, nullable=False)
    current_state = Column(String(10), nullable=False, default="red")  # 'red', 'yellow', 'green'
    density_percent = Column(Float, nullable=False, default=0.0)
    queue_count = Column(Integer, nullable=False, default=0)
    is_ambulance_detected = Column(Boolean, nullable=False, default=False)
    last_updated = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    # Relationships
    detections = relationship("Detection", back_populates="lane", cascade="all, delete-orphan")
    density_records = relationship("DensityHistory", back_populates="lane", cascade="all, delete-orphan")
    predictions = relationship("Prediction", back_populates="lane", cascade="all, delete-orphan")
    violations = relationship("Violation", back_populates="lane", cascade="all, delete-orphan")
    decision_logs = relationship("DecisionLog", back_populates="lane", cascade="all, delete-orphan")


class Detection(Base):
    __tablename__ = "detections"

    id = Column(Integer, primary_key=True, index=True)
    lane_id = Column(Integer, ForeignKey("lanes.id", ondelete="CASCADE"), nullable=False, index=True)
    vehicle_class = Column(String(30), nullable=False)  # car, bike, auto-rickshaw, bus, truck, ambulance
    confidence_score = Column(Float, nullable=False)
    bbox_x = Column(Float, nullable=False)  # Normalized 0.0 - 1.0 coordinates
    bbox_y = Column(Float, nullable=False)
    bbox_w = Column(Float, nullable=False)
    bbox_h = Column(Float, nullable=False)
    timestamp = Column(DateTime(timezone=True), default=utc_now, index=True)

    lane = relationship("Lane", back_populates="detections")


class DensityHistory(Base):
    __tablename__ = "density_history"

    id = Column(Integer, primary_key=True, index=True)
    lane_id = Column(Integer, ForeignKey("lanes.id", ondelete="CASCADE"), nullable=False, index=True)
    density_percent = Column(Float, nullable=False)
    recorded_at = Column(DateTime(timezone=True), default=utc_now, index=True)

    lane = relationship("Lane", back_populates="density_records")


class Prediction(Base):
    __tablename__ = "predictions"

    id = Column(Integer, primary_key=True, index=True)
    lane_id = Column(Integer, ForeignKey("lanes.id", ondelete="CASCADE"), nullable=False, index=True)
    predicted_density = Column(Float, nullable=False)
    prediction_horizon_seconds = Column(Integer, nullable=False, default=90)
    generated_at = Column(DateTime(timezone=True), default=utc_now, index=True)

    lane = relationship("Lane", back_populates="predictions")


class Violation(Base):
    __tablename__ = "violations"

    id = Column(Integer, primary_key=True, index=True)
    lane_id = Column(Integer, ForeignKey("lanes.id", ondelete="CASCADE"), nullable=False, index=True)
    plate_number = Column(String(20), nullable=False)
    confidence_score = Column(Float, nullable=False)
    violation_type = Column(String(50), nullable=False)
    timestamp = Column(DateTime(timezone=True), default=utc_now, index=True)

    lane = relationship("Lane", back_populates="violations")


class EvaluationMetric(Base):
    __tablename__ = "evaluation_metrics"

    id = Column(Integer, primary_key=True, index=True)
    metric_name = Column(String(50), unique=True, nullable=False)
    value = Column(Float, nullable=False)
    unit = Column(String(20), nullable=False)
    recorded_at = Column(DateTime(timezone=True), default=utc_now)


class DecisionLog(Base):
    __tablename__ = "decision_log"

    id = Column(Integer, primary_key=True, index=True)
    lane_id = Column(Integer, ForeignKey("lanes.id", ondelete="CASCADE"), nullable=False, index=True)
    rule_triggered = Column(String(50), nullable=False)  # 'emergency', 'predictive', 'density', 'fairness'
    action_taken = Column(Text, nullable=False)
    timestamp = Column(DateTime(timezone=True), default=utc_now, index=True)

    lane = relationship("Lane", back_populates="decision_logs")
