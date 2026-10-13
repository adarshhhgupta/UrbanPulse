from ultralytics import YOLO
import cv2
import os

model = YOLO('yolov8m.pt')
cap = cv2.VideoCapture('backend/videos/lane4.mp4')
fps = cap.get(cv2.CAP_PROP_FPS)

# Let's inspect at t = 3.0s, 5.0s, 6.0s
for t in [3.0, 5.0, 6.0]:
    cap.set(cv2.CAP_PROP_POS_FRAMES, int(t * fps))
    ret, frame = cap.read()
    if not ret:
        continue
    res = model.predict(frame, conf=0.25, verbose=False)[0]
    print(f"\n=== LANE 4 AT {t}s (Raw detections: {len(res.boxes)}) ===")
    for b in res.boxes:
        cls_name = model.names[int(b.cls[0])]
        conf = float(b.conf[0])
        xywhn = b.xywhn[0].tolist()
        x = xywhn[0] - xywhn[2]/2
        y = xywhn[1] - xywhn[3]/2
        w = xywhn[2]
        h = xywhn[3]
        print(f"  {cls_name:12} conf={conf:.2f} | x={x:.3f}, y={y:.3f}, w={w:.3f}, h={h:.3f}")

cap.release()
