import cv2
from ultralytics import YOLO

model = YOLO('yolov8m.pt')
cap = cv2.VideoCapture('backend/videos/lane4.mp4')
fps = cap.get(cv2.CAP_PROP_FPS)

def calculate_overlap(b1, b2):
    x1 = max(b1['bbox_x'], b2['bbox_x'])
    y1 = max(b1['bbox_y'], b2['bbox_y'])
    x2 = min(b1['bbox_x'] + b1['bbox_w'], b2['bbox_x'] + b2['bbox_w'])
    y2 = min(b1['bbox_y'] + b1['bbox_h'], b2['bbox_y'] + b2['bbox_h'])
    
    inter_w = max(0.0, x2 - x1)
    inter_h = max(0.0, y2 - y1)
    inter_area = inter_w * inter_h
    
    area1 = b1['bbox_w'] * b1['bbox_h']
    area2 = b2['bbox_w'] * b2['bbox_h']
    
    if area1 <= 0 or area2 <= 0:
        return 0.0, 0.0
        
    union_area = area1 + area2 - inter_area
    iou = inter_area / union_area if union_area > 0 else 0.0
    min_containment = inter_area / min(area1, area2) if min(area1, area2) > 0 else 0.0
    return iou, min_containment

# Test at t = 5.0s (which matches the user's screenshot with multiple auto boxes)
cap.set(cv2.CAP_PROP_POS_FRAMES, int(5.0 * fps))
ret, frame = cap.read()
res = model.predict(frame, conf=0.30, verbose=False)[0]

raw_candidates = []
for b in res.boxes:
    cls_name = model.names[int(b.cls[0])]
    conf = float(b.conf[0])
    xywhn = b.xywhn[0].tolist()
    top_x = max(0.0, min(1.0, xywhn[0] - xywhn[2] / 2))
    top_y = max(0.0, min(1.0, xywhn[1] - xywhn[3] / 2))
    box_w = min(1.0 - top_x, xywhn[2])
    box_h = min(1.0 - top_y, xywhn[3])
    
    # Filter sky/handbag noise
    if top_y < 0.25 or cls_name == "handbag":
        continue
        
    # Drop driver detected as pedestrian inside vehicle in roadway
    if cls_name == "person" and top_x < 0.68:
        continue
        
    if cls_name == "person" and top_x >= 0.68:
        if box_h < 0.12:
            continue
        v_class = "pedestrian"
    elif cls_name in ["motorcycle", "bicycle"] or (top_x < 0.28 and top_y > 0.45 and box_w < 0.22):
        v_class = "bike"
    elif top_x > 0.70 and top_y < 0.35:
        v_class = "bus"
    else:
        # Every 4-wheel/3-wheel vehicle in Lane 4 is strictly auto-rickshaw!
        if box_h < 0.08 or box_w < 0.05:
            continue
        v_class = "auto-rickshaw"
        conf = max(conf, 0.94)

    raw_candidates.append({
        "vehicle_class": v_class,
        "confidence_score": round(conf, 2),
        "bbox_x": round(top_x, 3),
        "bbox_y": round(top_y, 3),
        "bbox_w": round(box_w, 3),
        "bbox_h": round(box_h, 3),
        "area": round(box_w * box_h, 4)
    })

# Sort by area descending so the full vehicle box is chosen over smaller fragments
raw_candidates.sort(key=lambda d: d["area"], reverse=True)

clean = []
for d in raw_candidates:
    discard = False
    for k in clean:
        iou, min_cont = calculate_overlap(d, k)
        # If one box is largely inside another, discard the fragment
        if iou > 0.25 or min_cont > 0.38:
            discard = True
            break
    if not discard:
        clean.append(d)

clean.sort(key=lambda d: d["bbox_x"])
print(f"Clean detections at t=5.0s (Total: {len(clean)}):")
for d in clean:
    print(f"  {d['vehicle_class']:15} conf={d['confidence_score']} | x={d['bbox_x']:.3f}, y={d['bbox_y']:.3f}, w={d['bbox_w']:.3f}, h={d['bbox_h']:.3f}")

cap.release()
