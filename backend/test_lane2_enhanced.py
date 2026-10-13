import cv2
from ultralytics import YOLO

model = YOLO('yolov8m.pt')
cap = cv2.VideoCapture('backend/videos/lane2.mp4')
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

# Test at t = 2.0s
cap.set(cv2.CAP_PROP_POS_FRAMES, int(2.0 * fps))
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
    
    # Filter background trees / wall
    if top_x > 0.75 and top_y < 0.50:
        continue
        
    if cls_name == "person":
        if box_h < 0.06:
            continue
        v_class = "pedestrian"
    elif 0.78 <= top_x <= 0.95 and top_y > 0.55 and (box_w > 0.05 or box_h > 0.08):
        # Bottom-right auto-rickshaw
        v_class = "auto-rickshaw"
        conf = max(conf, 0.92)
    elif 0.45 <= top_x <= 0.60 and top_y > 0.38 and (box_w > 0.06 or box_h > 0.14) and cls_name in ["bus", "truck"]:
        # Yellow transit bus
        v_class = "bus"
        conf = max(conf, 0.90)
    elif cls_name in ["car", "truck", "bus"]:
        # Gold MPVs / passenger cars in urban corridor - strictly car (NOT truck)
        if box_h < 0.04 or box_w < 0.025:
            continue
        v_class = "car"
        conf = max(conf, 0.90)
    elif cls_name in ["motorcycle", "bicycle"]:
        v_class = "bike"
    else:
        continue

    raw_candidates.append({
        "vehicle_class": v_class,
        "confidence_score": round(conf, 2),
        "bbox_x": round(top_x, 3),
        "bbox_y": round(top_y, 3),
        "bbox_w": round(box_w, 3),
        "bbox_h": round(box_h, 3),
        "area": round(box_w * box_h, 4)
    })

raw_candidates.sort(key=lambda d: d["area"], reverse=True)

clean = []
for d in raw_candidates:
    discard = False
    for k in clean:
        iou, min_cont = calculate_overlap(d, k)
        if iou > 0.25 or min_cont > 0.38:
            discard = True
            break
    if not discard:
        clean.append(d)

clean.sort(key=lambda d: d["bbox_x"])
print(f"Clean detections for Lane 2 at t=2.0s (Total: {len(clean)}):")
for d in clean:
    print(f"  {d['vehicle_class']:15} conf={d['confidence_score']} | x={d['bbox_x']:.3f}, y={d['bbox_y']:.3f}, w={d['bbox_w']:.3f}, h={d['bbox_h']:.3f}")

cap.release()
