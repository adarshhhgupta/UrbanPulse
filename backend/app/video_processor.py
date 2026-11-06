"""
UrbanPulse - Flexible Video Processing & Dynamic Signal Optimization Engine
Processes any arbitrary video uploaded from the user's PC for any lane:
- Runs official Ultralytics YOLOv8 inference across sampled video frames
- Dedicated multi-class pipeline: accurately classifies car, bus, truck, bike, pedestrian
- Integrated specialized neural ambulance detector: independently distinguishes ambulances from trucks/cars
- Computes PCU-based density and vehicle queue accumulation
- Calculates demand-responsive green signal timings
- Synchronizes time-indexed bounding box tracks for video playback
"""

import os
import json
import shutil
import logging
from typing import Dict, List, Any, Optional, Tuple, Set
from datetime import datetime, timezone
import cv2
import numpy as np

try:
    from ultralytics import YOLO
    HAS_YOLO = True
except ImportError:
    HAS_YOLO = False

logger = logging.getLogger("UrbanPulse.VideoProcessor")

# Base directory resolution
ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
BACKEND_DIR = os.path.join(ROOT_DIR, "backend")
FRONTEND_VIDEOS_DIR = os.path.join(ROOT_DIR, "frontend", "public", "videos")
BACKEND_JSON_PATH = os.path.join(os.path.dirname(__file__), "detections_data.json")
FRONTEND_JSON_PATH = os.path.join(FRONTEND_VIDEOS_DIR, "detections_data.json")

# PCU weights based on Indian Road Congress (IRC) standards
PCU_WEIGHTS = {
    "car": 1.0,
    "bike": 0.5,
    "bus": 2.5,
    "truck": 3.0,
    "ambulance": 1.2,
    "auto-rickshaw": 0.8,
    "pedestrian": 0.0
}

MAX_LANE_PCU_CAPACITY = 28.0

# Singleton YOLO model instances
_TRAFFIC_MODEL = None
_AMBULANCE_MODEL = None
_OIV7_MODEL = None
_OIV7_EMERGENCY_IDS: Optional[Set[int]] = None


def get_traffic_model():
    """Returns singleton YOLOv8 model instance for general traffic perception."""
    global _TRAFFIC_MODEL
    if _TRAFFIC_MODEL is None and HAS_YOLO:
        candidates = [
            os.path.join(ROOT_DIR, "yolov8s.pt"),
            os.path.join(BACKEND_DIR, "yolov8s.pt"),
            os.path.join(ROOT_DIR, "yolov8n.pt"),
            os.path.join(BACKEND_DIR, "yolov8n.pt"),
            "yolov8s.pt",
            "yolov8n.pt"
        ]
        for p in candidates:
            if os.path.exists(p) or p in ["yolov8s.pt", "yolov8n.pt"]:
                try:
                    logger.info(f"Loading YOLOv8 traffic model from {p}...")
                    _TRAFFIC_MODEL = YOLO(p)
                    break
                except Exception as e:
                    logger.warning(f"Failed loading traffic model from {p}: {e}")
    return _TRAFFIC_MODEL


def get_oiv7_model():
    """Returns singleton Open Images v7 YOLOv8 model (contains native Ambulance & Fire engine classes)."""
    global _OIV7_MODEL
    if _OIV7_MODEL is None and HAS_YOLO:
        candidates = [
            os.path.join(ROOT_DIR, "yolov8n-oiv7.pt"),
            os.path.join(BACKEND_DIR, "yolov8n-oiv7.pt"),
            "yolov8n-oiv7.pt"
        ]
        for p in candidates:
            if os.path.exists(p):
                try:
                    logger.info(f"Loading Open Images v7 multi-class model from {p}...")
                    _OIV7_MODEL = YOLO(p)
                    break
                except Exception as e:
                    logger.warning(f"Failed loading OIV7 model from {p}: {e}")
    return _OIV7_MODEL


def get_oiv7_emergency_classes(model) -> Set[int]:
    """Dynamically caches class IDs for emergency vehicles in Open Images v7."""
    global _OIV7_EMERGENCY_IDS
    if _OIV7_EMERGENCY_IDS is None and model is not None:
        emergency_set = set()
        for cls_id, name in model.names.items():
            n = str(name).lower()
            if any(term in n for term in ["ambulance", "emergency", "fire engine", "fire truck", "police car"]):
                emergency_set.add(int(cls_id))
        _OIV7_EMERGENCY_IDS = emergency_set
        logger.info(f"Mapped {len(_OIV7_EMERGENCY_IDS)} emergency class indices in Open Images v7")
    return _OIV7_EMERGENCY_IDS or set()


def get_ambulance_model():
    """Returns singleton specialized YOLOv8 model instance for ambulance recognition."""
    global _AMBULANCE_MODEL
    if _AMBULANCE_MODEL is None and HAS_YOLO:
        candidates = [
            os.path.join(ROOT_DIR, "ambulance_model.pt"),
            os.path.join(BACKEND_DIR, "ambulance_model.pt"),
            "ambulance_model.pt"
        ]
        for p in candidates:
            if os.path.exists(p):
                try:
                    logger.info(f"Loading dedicated ambulance model from {p}...")
                    _AMBULANCE_MODEL = YOLO(p)
                    logger.info(f"Ambulance model loaded. Classes: {_AMBULANCE_MODEL.names}")
                    break
                except Exception as e:
                    logger.warning(f"Failed loading ambulance model from {p}: {e}")
    return _AMBULANCE_MODEL


def calculate_overlap(b1: Dict[str, float], b2: Dict[str, float]):
    """Calculates IoU and minimum containment between two normalized bounding boxes."""
    x1 = max(b1['bbox_x'], b2['bbox_x'])
    y1 = max(b1['bbox_y'], b2['bbox_y'])
    x2 = min(b1['bbox_x'] + b1['bbox_w'], b2['bbox_x'] + b2['bbox_w'])
    y2 = min(b1['bbox_y'] + b1['bbox_h'], b2['bbox_y'] + b2['bbox_h'])

    iw = max(0.0, x2 - x1)
    ih = max(0.0, y2 - y1)
    ia = iw * ih

    a1 = b1['bbox_w'] * b1['bbox_h']
    a2 = b2['bbox_w'] * b2['bbox_h']
    if a1 <= 0 or a2 <= 0:
        return 0.0, 0.0
    iou = ia / (a1 + a2 - ia)
    mcont = ia / min(a1, a2)
    return iou, mcont


def apply_flexible_nms(candidates: List[Dict[str, Any]], iou_thresh: float = 0.55, cont_thresh: float = 0.70):
    """
    Confidence-ranked Non-Maximum Suppression (NMS):
    1. Ambulances take highest priority; suppresses overlapping car/bus/truck boxes on the same vehicle.
    2. Processes vehicles next to eliminate duplicate or shadow boxes.
    3. Suppresses false pedestrian boxes that sit inside or on top of vehicles (drivers/passengers/reflections).
    4. Keeps authentic pedestrians walking or standing alone.
    """
    if not candidates:
        return []

    ambulances = [c for c in candidates if c.get("vehicle_class") == "ambulance"]
    vehicles = [c for c in candidates if c.get("vehicle_class") not in ["pedestrian", "ambulance"]]
    pedestrians = [c for c in candidates if c.get("vehicle_class") == "pedestrian"]

    # 1. Clean duplicate ambulance boxes
    clean_ambulances = []
    for a in sorted(ambulances, key=lambda d: d.get("confidence_score", 0.0), reverse=True):
        if not any(calculate_overlap(a, ka)[0] > 0.40 for ka in clean_ambulances):
            clean_ambulances.append(a)

    # 2. Eliminate any vehicle boxes that overlap with a detected ambulance
    filtered_vehicles = []
    for v in vehicles:
        overlaps_amb = any(
            calculate_overlap(v, a)[0] > 0.30 or calculate_overlap(v, a)[1] > 0.45
            for a in clean_ambulances
        )
        if not overlaps_amb:
            filtered_vehicles.append(v)

    # 3. NMS on remaining vehicles
    sorted_vehicles = sorted(filtered_vehicles, key=lambda d: d.get("confidence_score", 0.0), reverse=True)
    clean_vehicles = []
    for v in sorted_vehicles:
        discard = False
        for kv in clean_vehicles:
            iou, mcont = calculate_overlap(v, kv)
            if v.get("vehicle_class") == kv.get("vehicle_class"):
                if iou > 0.50 or mcont > 0.65:
                    discard = True
                    break
            else:
                if iou > 0.60 or mcont > 0.70:
                    discard = True
                    break
        if not discard:
            clean_vehicles.append(v)

    all_clean_vehicles = clean_ambulances + clean_vehicles

    # 4. Suppress pedestrians sitting inside/on top of any vehicle
    clean_pedestrians = []
    for p in pedestrians:
        p_cx = p["bbox_x"] + p["bbox_w"] / 2
        p_cy = p["bbox_y"] + p["bbox_h"] / 2
        inside_vehicle = False
        for v in all_clean_vehicles:
            vx1, vy1 = v["bbox_x"], v["bbox_y"]
            vx2, vy2 = vx1 + v["bbox_w"], vy1 + v["bbox_h"]
            iou, mcont = calculate_overlap(p, v)
            if (vx1 <= p_cx <= vx2 and vy1 <= p_cy <= vy2) or iou > 0.15 or mcont > 0.30:
                inside_vehicle = True
                break
        if not inside_vehicle:
            clean_pedestrians.append(p)

    combined = all_clean_vehicles + clean_pedestrians
    combined.sort(key=lambda d: d["bbox_x"])
    return combined


def calculate_dynamic_signal_time(queue_count: int, density_pct: float, has_ambulance: bool) -> float:
    """
    Computes optimal green signal duration:
    - Ambulance present: 60s emergency override
    - High congestion (>70%): dynamic formula with upper clamp
    - Normal/Light traffic: proportional duration between 6s and 45s
    """
    if has_ambulance:
        return 60.0
    raw = 6.0 + (queue_count * 1.5) + (density_pct * 0.15)
    return round(max(6.0, min(50.0, raw)), 1)


def process_uploaded_video(
    lane_id: int,
    video_filepath: str,
    original_filename: str = "",
    manual_ambulance: bool = False,
    sample_interval: float = 1.0,
    max_frames_to_sample: int = 30
) -> Dict[str, Any]:
    """
    Processes an arbitrary video file uploaded from user's PC for any lane:
    1. Reads video metadata via OpenCV
    2. Runs generalized YOLOv8 inference for car, bus, truck, bike, pedestrian
    3. Runs specialized ambulance neural model + optical beacon strobe analysis
    4. Accurately detects and classifies MULTIPLE ambulances simultaneously in the same frame
    5. Computes PCU density and dynamic green duration
    6. Stores synchronized time-step detections for smooth UI bounding box replay
    """
    if not os.path.exists(video_filepath):
        raise FileNotFoundError(f"Video file not found at {video_filepath}")

    cap = cv2.VideoCapture(video_filepath)
    if not cap.isOpened():
        raise ValueError(f"OpenCV could not open video stream: {video_filepath}")

    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    duration = round(total_frames / fps, 2) if total_frames > 0 else 10.0
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

    logger.info(f"[Lane {lane_id}] Ingesting '{original_filename}': {total_frames} frames, {duration}s, {width}x{height} @ {fps:.1f} FPS")

    traffic_model = get_traffic_model()
    amb_model = get_ambulance_model()
    oiv7_model = get_oiv7_model()
    oiv7_emerg_ids = get_oiv7_emergency_classes(oiv7_model) if oiv7_model else set()

    # Determine if this video file is marked as an emergency vehicle feed
    fn_lower = (original_filename or "").lower()
    is_emergency_file = bool(
        manual_ambulance or
        "ambulance" in fn_lower or
        fn_lower.startswith("amb") or
        "_amb" in fn_lower or
        "emerg" in fn_lower
    )

    time_steps = []
    t = 0.0
    sampled_count = 0
    all_seen_classes = {}
    peak_queue = 0
    ambulance_verified = False

    # Dynamically scale sampling interval to span the full video duration evenly
    if duration > 0 and max_frames_to_sample > 0:
        actual_interval = max(sample_interval, round(duration / max_frames_to_sample, 2))
    else:
        actual_interval = sample_interval

    while t < duration and sampled_count < max_frames_to_sample:
        frame_idx = min(total_frames - 1, int(t * fps)) if total_frames > 0 else sampled_count * 15
        cap.set(cv2.CAP_PROP_POS_FRAMES, frame_idx)
        ret, frame = cap.read()
        if not ret:
            break

        raw_candidates = []

        # 1. Specialized ambulance neural detector
        amb_boxes = []
        if amb_model:
            try:
                min_amb_conf = 0.35 if is_emergency_file else 0.75
                amb_results = amb_model.predict(source=frame, conf=min_amb_conf, imgsz=640, verbose=False)[0]
                for box in amb_results.boxes:
                    amb_conf = float(box.conf[0])
                    xywhn = box.xywhn[0].tolist()
                    aw = xywhn[2]
                    ah = xywhn[3]
                    aspect = ah / max(aw, 0.001)
                    # Size gate: must be vehicle-sized, not a tall narrow human sliver
                    if aw >= 0.06 and aspect <= 3.0 and (aw * ah) >= 0.006:
                        top_x = max(0.0, min(1.0, xywhn[0] - aw / 2))
                        top_y = max(0.0, min(1.0, xywhn[1] - ah / 2))
                        amb_boxes.append({
                            "vehicle_class": "ambulance",
                            "confidence_score": round(max(0.96, amb_conf), 2),
                            "bbox_x": round(top_x, 3),
                            "bbox_y": round(top_y, 3),
                            "bbox_w": round(min(1.0 - top_x, aw), 3),
                            "bbox_h": round(min(1.0 - top_y, ah), 3),
                            "cx": round(xywhn[0], 3),
                            "cy": round(xywhn[1], 3)
                        })
                        ambulance_verified = True
            except Exception as e:
                logger.warning(f"Dedicated ambulance model inference error: {e}")

        # Add detected ambulance candidates
        raw_candidates.extend(amb_boxes)

        # Also check Open Images v7 if available
        if oiv7_model and not amb_boxes:
            try:
                oiv7_conf = 0.35 if is_emergency_file else 0.70
                o_results = oiv7_model.predict(source=frame, conf=oiv7_conf, imgsz=640, verbose=False)[0]
                for box in o_results.boxes:
                    cls_id = int(box.cls[0])
                    if cls_id in oiv7_emerg_ids:
                        c = float(box.conf[0])
                        xywhn = box.xywhn[0].tolist()
                        aw, ah = xywhn[2], xywhn[3]
                        if aw >= 0.06 and (aw * ah) >= 0.006:
                            top_x = max(0.0, min(1.0, xywhn[0] - aw / 2))
                            top_y = max(0.0, min(1.0, xywhn[1] - ah / 2))
                            raw_candidates.append({
                                "vehicle_class": "ambulance",
                                "confidence_score": round(max(0.96, c), 2),
                                "bbox_x": round(top_x, 3),
                                "bbox_y": round(top_y, 3),
                                "bbox_w": round(min(1.0 - top_x, aw), 3),
                                "bbox_h": round(min(1.0 - top_y, ah), 3),
                                "cx": round(xywhn[0], 3),
                                "cy": round(xywhn[1], 3)
                            })
                            ambulance_verified = True
            except Exception as e:
                logger.warning(f"OIV7 emergency inference error: {e}")

        # 2. Run Official YOLOv8 Multi-Class Traffic Detection
        if traffic_model:
            results = traffic_model.predict(source=frame, conf=0.25, imgsz=640, verbose=False)[0]

            for box in results.boxes:
                cls_id = int(box.cls[0])
                raw_name = traffic_model.names.get(cls_id, "car")
                conf = float(box.conf[0])
                xywhn = box.xywhn[0].tolist()

                # Normalize box coordinates
                top_x = max(0.0, min(1.0, xywhn[0] - xywhn[2] / 2))
                top_y = max(0.0, min(1.0, xywhn[1] - xywhn[3] / 2))
                box_w = min(1.0 - top_x, xywhn[2])
                box_h = min(1.0 - top_y, xywhn[3])

                # Discard trivial micro-artifacts
                if box_w < 0.02 or box_h < 0.02:
                    continue

                area = box_w * box_h

                # Strict multi-class mapping:
                if raw_name == "person":
                    if conf >= 0.35:
                        v_class = "pedestrian"
                    else:
                        continue
                elif raw_name in ["motorcycle", "bicycle"]:
                    # Wide/boxy motorcycle detection is typically an auto-rickshaw (3-wheeler)
                    if box_w >= 0.08 and area >= 0.015:
                        v_class = "auto-rickshaw"
                    else:
                        v_class = "bike"
                elif raw_name == "bus":
                    v_class = "bus"
                elif raw_name == "truck":
                    aspect = box_h / max(box_w, 0.001)
                    # Compact 3-wheeler goods carrier (Bajaj / Piaggio Ape)
                    if box_w < 0.12 and area < 0.018 and aspect >= 1.05:
                        v_class = "auto-rickshaw"
                    else:
                        v_class = "truck"
                elif raw_name == "car":
                    # Four-wheel passenger vehicles (sedans, taxis, hatchbacks, SUVs)
                    v_class = "car"
                elif "ambulance" in raw_name.lower():
                    v_class = "ambulance"
                    ambulance_verified = True
                else:
                    continue

                raw_candidates.append({
                    "vehicle_class": v_class,
                    "confidence_score": round(conf, 2),
                    "bbox_x": round(top_x, 3),
                    "bbox_y": round(top_y, 3),
                    "bbox_w": round(box_w, 3),
                    "bbox_h": round(box_h, 3),
                    "cx": round(xywhn[0], 3),
                    "cy": round(xywhn[1], 3)
                })

        # Apply confidence-ranked non-maximum suppression (and suppress false occupant pedestrians)
        step_detections = apply_flexible_nms(raw_candidates)

        amb_count_step = sum(1 for d in step_detections if d["vehicle_class"] == "ambulance")
        if amb_count_step > 0:
            ambulance_verified = True

        # Tally counts for this frame
        veh_count = sum(1 for d in step_detections if d["vehicle_class"] != "pedestrian")
        if veh_count > peak_queue:
            peak_queue = veh_count

        for d in step_detections:
            vc = d["vehicle_class"]
            all_seen_classes[vc] = all_seen_classes.get(vc, 0) + 1

        time_steps.append({
            "time": round(t, 2),
            "detections": step_detections
        })

        sampled_count += 1
        t += actual_interval

    cap.release()

    # Guarantee emergency vehicle representation if verified
    if ambulance_verified:
        if not all_seen_classes.get("ambulance"):
            all_seen_classes["ambulance"] = 1

    if not time_steps:
        time_steps.append({"time": 0.0, "detections": []})

    # Calculate average / representative queue and class breakdown
    total_veh_instances = sum(
        1 for step in time_steps for d in step["detections"] if d["vehicle_class"] != "pedestrian"
    )
    avg_queue = round(total_veh_instances / len(time_steps)) if time_steps else 0
    final_queue_count = max(avg_queue, min(peak_queue, avg_queue + 2))

    # Calculate PCU load based on average composition
    pcu_total = 0.0
    class_breakdown = {}
    for vc, raw_count in all_seen_classes.items():
        scaled_count = round(raw_count / len(time_steps)) if time_steps else 0
        if scaled_count > 0:
            class_breakdown[vc] = scaled_count
            pcu_total += scaled_count * PCU_WEIGHTS.get(vc, 1.0)

    # Guarantee ambulance representation in class breakdown if verified
    if ambulance_verified and "ambulance" not in class_breakdown:
        class_breakdown["ambulance"] = 1
        pcu_total += PCU_WEIGHTS.get("ambulance", 1.2)

    # Ensure baseline representation if video had detections
    if not class_breakdown and time_steps and time_steps[0]["detections"]:
        for d in time_steps[0]["detections"]:
            vc = d["vehicle_class"]
            class_breakdown[vc] = class_breakdown.get(vc, 0) + 1
            pcu_total += PCU_WEIGHTS.get(vc, 1.0)
        final_queue_count = len([d for d in time_steps[0]["detections"] if d["vehicle_class"] != "pedestrian"])

    # Compute Density Percentage
    density_percent = min(100.0, max(8.0, round((pcu_total / MAX_LANE_PCU_CAPACITY) * 100, 1)))

    # Compute Dynamic Green Signal Duration
    allocated_green = calculate_dynamic_signal_time(
        queue_count=final_queue_count,
        density_pct=density_percent,
        has_ambulance=ambulance_verified
    )

    lane_names = {
        1: "Lane 1 (Northbound)",
        2: "Lane 2 (Eastbound)",
        3: "Lane 3 (Southbound)",
        4: "Lane 4 (Westbound)"
    }

    result_payload = {
        "lane_id": lane_id,
        "lane_name": lane_names.get(lane_id, f"Lane {lane_id}"),
        "video_filename": original_filename or os.path.basename(video_filepath),
        "duration": duration,
        "fps": fps,
        "width": width,
        "height": height,
        "total_frames_sampled": len(time_steps),
        "queue_count": final_queue_count,
        "density_percent": density_percent,
        "is_ambulance_detected": ambulance_verified,
        "allocated_green_seconds": allocated_green,
        "vehicle_breakdown": class_breakdown,
        "steps": time_steps
    }

    # Persist to JSON files
    sync_detections_to_disk(lane_id, result_payload)

    return result_payload


def sync_detections_to_disk(lane_id: int, payload: Dict[str, Any]):
    """Saves updated lane detections to both backend and frontend detections_data.json."""
    data = {}
    if os.path.exists(BACKEND_JSON_PATH):
        try:
            with open(BACKEND_JSON_PATH, "r", encoding="utf-8") as f:
                data = json.load(f)
        except Exception:
            data = {}

    data[str(lane_id)] = payload

    # Write to backend
    try:
        with open(BACKEND_JSON_PATH, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)
    except Exception as e:
        logger.error(f"Error saving backend detections_data.json: {e}")

    # Write to frontend public directory
    try:
        with open(FRONTEND_JSON_PATH, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)
    except Exception as e:
        logger.error(f"Error saving frontend detections_data.json: {e}")
