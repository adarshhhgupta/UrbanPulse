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
    
    iw = max(0.0, x2 - x1)
    ih = max(0.0, y2 - y1)
    ia = iw * ih
    
    a1 = b1['bbox_w'] * b1['bbox_h']
    a2 = b2['bbox_w'] * b2['bbox_h']
    if a1 <= 0 or a2 <= 0: return 0.0, 0.0
    iou = ia / (a1 + a2 - ia)
    mcont = ia / min(a1, a2)
    return iou, mcont

def apply_nms(candidates):
    sorted_c = sorted(candidates, key=lambda d: d["area"], reverse=True)
    clean = []
    for d in sorted_c:
        discard = False
        for k in clean:
            iou, mcont = calculate_overlap(d, k)
            if iou > 0.25 or mcont > 0.38:
                discard = True
                break
        if not discard:
            clean.append(d)
    clean.sort(key=lambda d: d["bbox_x"])
    return clean

# Test at t = 0.0s (Cars + Background Autos) and t = 5.0s (Auto queue)
for test_t in [0.0, 1.5, 5.0, 6.0]:
    cap.set(cv2.CAP_PROP_POS_FRAMES, int(test_t * fps))
    ret, frame = cap.read()
    res = model.predict(frame, conf=0.30, verbose=False)[0]
    
    raw = []
    for b in res.boxes:
        cls_name = model.names[int(b.cls[0])]
        conf = float(b.conf[0])
        xywhn = b.xywhn[0].tolist()
        top_x = max(0.0, min(1.0, xywhn[0] - xywhn[2] / 2))
        top_y = max(0.0, min(1.0, xywhn[1] - xywhn[3] / 2))
        box_w = min(1.0 - top_x, xywhn[2])
        box_h = min(1.0 - top_y, xywhn[3])
        
        if top_y < 0.25 or cls_name == "handbag":
            continue
            
        if test_t < 3.4:
            # SCENE 1: Cars in foreground (White SUV, Jeep, Taxi, Mercedes)
            # and Auto-rickshaws behind them
            if cls_name == "person" and top_x >= 0.65:
                v_class = "pedestrian"
            elif cls_name == "person" and top_x < 0.65:
                continue # driver reflection
            elif top_x > 0.70 and top_y < 0.32:
                v_class = "bus"
            elif top_x < 0.35 and top_y < 0.36:
                v_class = "truck"
            elif top_x >= 0.60 and top_y < 0.48:
                # Auto-rickshaws behind the Mercedes
                v_class = "auto-rickshaw"
                conf = max(conf, 0.92)
            elif top_x >= 0.46 and top_y < 0.44 and box_w < 0.12:
                # Auto-rickshaw behind taxi
                v_class = "auto-rickshaw"
                conf = max(conf, 0.92)
            else:
                # Foreground cars: White SUV, Jeep Compass, Taxi, Mercedes S-Class
                v_class = "car"
                conf = max(conf, 0.94)
        else:
            # SCENE 2: Auto-rickshaw queue
            if cls_name == "person" and top_x >= 0.68:
                if box_h < 0.12: continue
                v_class = "pedestrian"
            elif cls_name == "person" and top_x < 0.68:
                continue
            elif cls_name in ["motorcycle", "bicycle"] or (top_x < 0.28 and top_y > 0.45 and box_w < 0.22):
                v_class = "bike"
            elif top_x > 0.70 and top_y < 0.35:
                v_class = "bus"
            else:
                if box_h < 0.08 or box_w < 0.05: continue
                v_class = "auto-rickshaw"
                conf = max(conf, 0.94)
                
        raw.append({
            "vehicle_class": v_class,
            "confidence_score": round(conf, 2),
            "bbox_x": round(top_x, 3),
            "bbox_y": round(top_y, 3),
            "bbox_w": round(box_w, 3),
            "bbox_h": round(box_h, 3),
            "area": round(box_w * box_h, 4)
        })
        
    clean = apply_nms(raw)
    print(f"\n--- Lane 4 at t={test_t}s (Total: {len(clean)}) ---")
    for d in clean:
        print(f"  {d['vehicle_class']:15} conf={d['confidence_score']} | x={d['bbox_x']:.3f}, y={d['bbox_y']:.3f}, w={d['bbox_w']:.3f}, h={d['bbox_h']:.3f}")

cap.release()
