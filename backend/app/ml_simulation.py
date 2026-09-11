"""
UrbanPulse - Machine Learning Simulation & Fallback Estimation Engine
Simulates YOLOv8 computer vision detection, PCU-based density calculation,
frame-differencing fallback estimation, and LSTM multi-horizon queue forecasting.
"""

import math
import random
from datetime import datetime, timedelta
from typing import List, Dict, Tuple

# ============================================================================
# SYSTEM CONFIGURATION CONSTANTS
# ============================================================================
FRAME_EXTRACTION_FPS = 8  # Hardware sampling budget (5–10 FPS per RTSP camera stream)
DETECTION_CONFIDENCE_THRESHOLD = 0.65  # Trigger threshold below which fallback estimation activates

# Exactly 6 domain classes fine-tuned for Indian/urban traffic environments
VEHICLE_CLASSES = [
    "car",
    "bike",
    "auto-rickshaw",
    "bus",
    "truck",
    "ambulance"
]

# Passenger Car Unit (PCU) equivalents for geometric roadway occupancy
PCU_WEIGHTS = {
    "bike": 0.5,
    "auto-rickshaw": 0.8,
    "car": 1.0,
    "ambulance": 1.2,
    "bus": 2.5,
    "truck": 3.0
}

# Maximum effective PCU capacity per 100m detection approach zone
MAX_LANE_PCU_CAPACITY = 28.0


# ============================================================================
# 1. VEHICLE DETECTION ENGINE (YOLOv8 SIMULATION)
# ============================================================================
def generate_detections_for_lane(
    lane_number: int,
    force_ambulance: bool = False
) -> List[Dict]:
    """
    Simulates spatial object detection output from an on-device YOLOv8s TensorRT engine.
    
    # --------------------------------------------------------------------------
    # PRODUCTION NOTE:
    # Replace with real Ultralytics YOLOv8 inference here:
    #
    # from ultralytics import YOLO
    # model = YOLO("weights/yolov8s_urban_traffic.pt")
    # results = model.predict(source=camera_frame, conf=0.5, iou=0.45)
    # detections = [
    #     {
    #         "vehicle_class": model.names[int(box.cls)],
    #         "confidence_score": float(box.conf),
    #         "bbox_x": float(box.xywhn[0][0]),
    #         "bbox_y": float(box.xywhn[0][1]),
    #         "bbox_w": float(box.xywhn[0][2]),
    #         "bbox_h": float(box.xywhn[0][3])
    #     }
    #     for box in results[0].boxes
    # ]
    # --------------------------------------------------------------------------
    """
    detections = []

    # Lane 1 in Reference Scenario defaults to active ambulance detection
    if force_ambulance or lane_number == 1:
        detections.append({
            "vehicle_class": "ambulance",
            "confidence_score": round(random.uniform(0.97, 0.99), 3),
            "bbox_x": 0.32,
            "bbox_y": 0.24,
            "bbox_w": 0.34,
            "bbox_h": 0.50
        })
        # Add normal escort/trailing traffic
        detections.append({
            "vehicle_class": "car",
            "confidence_score": round(random.uniform(0.91, 0.96), 3),
            "bbox_x": 0.70,
            "bbox_y": 0.55,
            "bbox_w": 0.22,
            "bbox_h": 0.35
        })
        return detections

    # Target counts based on Reference Scenario lane profiles
    if lane_number == 2:
        target_count = random.randint(14, 20)  # High density (~82%)
    elif lane_number == 3:
        target_count = random.randint(2, 4)    # Low density (~18%)
    else:  # Lane 4
        target_count = random.randint(7, 10)   # Medium rising density (~55%)

    classes_pool = ["car", "car", "car", "bike", "bike", "auto-rickshaw", "truck", "bus"]

    for _ in range(target_count):
        v_class = random.choice(classes_pool)
        conf = round(random.uniform(0.82, 0.97), 3)
        w = round(random.uniform(0.12, 0.28), 3)
        h = round(random.uniform(0.20, 0.45), 3)
        x = round(random.uniform(0.05, 0.95 - w), 3)
        y = round(random.uniform(0.10, 0.90 - h), 3)

        detections.append({
            "vehicle_class": v_class,
            "confidence_score": conf,
            "bbox_x": x,
            "bbox_y": y,
            "bbox_w": w,
            "bbox_h": h
        })

    return detections


# ============================================================================
# 2. DENSITY ESTIMATION & SUPPLEMENTARY FALLBACK
# ============================================================================
def calculate_density_from_detections(detections: List[Dict]) -> Tuple[float, int, bool]:
    """
    Computes roadway density percentage and queue count from bounding box detections
    normalized by Passenger Car Unit (PCU) roadway weights.
    Returns: (density_percent, queue_count, is_ambulance_detected)
    """
    total_pcu = 0.0
    queue_count = len(detections)
    has_ambulance = False
    confidences = []

    for d in detections:
        v_class = d.get("vehicle_class", "car")
        conf = d.get("confidence_score", 0.9)
        confidences.append(conf)

        weight = PCU_WEIGHTS.get(v_class, 1.0)
        total_pcu += weight

        if v_class == "ambulance" and conf >= 0.85:
            has_ambulance = True

    # Check if detection confidence is degraded (low light / heavy downpour / occlusion)
    avg_conf = sum(confidences) / max(len(confidences), 1)
    if avg_conf < DETECTION_CONFIDENCE_THRESHOLD and not has_ambulance:
        # ----------------------------------------------------------------------
        # FALLBACK PATH:
        # When bounding box detection confidence falls below threshold, activate
        # frame-differencing / background-subtraction density estimation to avoid
        # under-counting congested or obscured queues.
        # ----------------------------------------------------------------------
        fallback_density = estimate_density_via_frame_differencing(
            synthetic_motion_index=random.uniform(0.4, 0.85)
        )
        density_percent = min(100.0, max(0.0, fallback_density))
    else:
        # Standard primary path: PCU normalized against approach zone capacity
        density_percent = min(100.0, max(0.0, (total_pcu / MAX_LANE_PCU_CAPACITY) * 100.0))

    return round(density_percent, 1), queue_count, has_ambulance


def estimate_density_via_frame_differencing(synthetic_motion_index: float) -> float:
    """
    Fallback congestion estimator using temporal frame differencing / background subtraction.
    
    # --------------------------------------------------------------------------
    # OpenCV PRODUCTION IMPLEMENTATION:
    # def opencv_background_subtraction(frame, bg_subtractor):
    #     fg_mask = bg_subtractor.apply(frame)
    #     kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
    #     closing = cv2.morphologyEx(fg_mask, cv2.MORPH_CLOSE, kernel)
    #     occupied_pixels = cv2.countNonZero(closing)
    #     total_pixels = frame.shape[0] * frame.shape[1]
    #     return (occupied_pixels / total_pixels) * 100.0
    # --------------------------------------------------------------------------
    """
    # Computes proxy density from structural pixel motion mask ratio
    raw_density = synthetic_motion_index * 100.0
    return round(raw_density, 1)


# ============================================================================
# 3. LSTM TIME-SERIES PREDICTION ENGINE
# ============================================================================
def generate_lstm_forecast(
    lane_id: int,
    lane_number: int,
    current_density: float,
    history_records: List[Dict] = None
) -> Dict:
    """
    Simulates sequence-to-sequence LSTM queue accumulation forecasting.
    Generates a continuous timeline:
      - 30 minutes of past observed density (T-30 to T-0)
      - 10 minutes of multi-horizon predicted density (T+0 to T+10)
    
    # --------------------------------------------------------------------------
    # PRODUCTION NOTE:
    # Replace with trained PyTorch LSTM model inference:
    #
    # import torch
    # model = TrafficLSTM(input_dim=1, hidden_dim=64, num_layers=2, output_dim=12)
    # model.load_state_dict(torch.load("weights/lstm_pems_traffic.pth"))
    # input_tensor = torch.tensor(recent_30m_densities).unsqueeze(0).unsqueeze(-1)
    # with torch.no_grad():
    #     predicted_tensor = model(input_tensor)
    # predictions = predicted_tensor.squeeze().tolist()
    # --------------------------------------------------------------------------
    """
    now = datetime.utcnow()
    points = []

    # 1. Historical Observed Points (T-30m to T-0 in 5-minute increments)
    for minute_offset in range(30, -5, -5):
        t = now - timedelta(minutes=minute_offset)
        time_label = t.strftime("%H:%M")

        # Create realistic trajectory based on lane profile
        if lane_number == 4:
            # Lane 4: Upward surge approaching junction bottleneck
            base = 25.0 + (30 - minute_offset) * 1.0 + math.sin(minute_offset * 0.2) * 2.0
        elif lane_number == 2:
            # Lane 2: Sustained saturated bottleneck
            base = 75.0 + math.sin(minute_offset * 0.3) * 3.0
        elif lane_number == 3:
            # Lane 3: Low free-flowing approach
            base = 16.0 + math.cos(minute_offset * 0.1) * 2.0
        else:  # Lane 1
            base = 40.0 + math.sin(minute_offset * 0.15) * 2.5

        val = round(max(5.0, min(95.0, base)), 1)
        if minute_offset == 0:
            val = current_density

        points.append({
            "timestamp": time_label,
            "observed": val,
            "predicted": None
        })

    # Bridge point at T=0
    points[-1]["predicted"] = points[-1]["observed"]

    # 2. Future Forecast Points (T+2m to T+10m in 2-minute increments)
    last_val = points[-1]["observed"]
    trend_desc = ""

    if lane_number == 4:
        # Reference Scenario: LSTM forecasts +23% density surge within 90s (reaching ~78%)
        trend_desc = "SURGE DETECTED: LSTM forecasts +23% density spike in next 90s — predictive pre-emption green required."
        slope = 2.4
    elif lane_number == 2:
        trend_desc = "SATURATED: Sustained peak density forecast (>80%) across 10-minute planning horizon."
        slope = 0.4
    elif lane_number == 3:
        trend_desc = "FREE FLOW: Stable low-density corridor (<22%). Starvation timer actively monitored."
        slope = 0.1
    else:
        trend_desc = "EMERGENCY CLEARING: Rapid density dissipation once priority green completes."
        slope = -1.2

    for minute_ahead in [2, 4, 6, 8, 10]:
        t_future = now + timedelta(minutes=minute_ahead)
        forecast_val = last_val + (slope * minute_ahead) + random.uniform(-1.0, 1.0)
        forecast_val = round(max(5.0, min(98.0, forecast_val)), 1)

        points.append({
            "timestamp": t_future.strftime("%H:%M"),
            "observed": None,
            "predicted": forecast_val
        })

    return {
        "lane_id": lane_id,
        "lane_number": lane_number,
        "current_density": current_density,
        "trend_description": trend_desc,
        "points": points
    }
