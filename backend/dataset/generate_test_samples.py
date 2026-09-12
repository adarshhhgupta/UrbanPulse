"""
UrbanPulse - Dataset Test Set Generator
Extracts representative test set frames from backend/videos/ (lane1.mp4 to lane4.mp4)
and generates matching YOLO-format label annotations in backend/dataset/labels/test/
using extracted detections from detections_data.json.
"""

import os
import json
import cv2

CLASS_MAP = {
    "car": 0,
    "bike": 1,
    "auto-rickshaw": 2,
    "bus": 3,
    "truck": 4,
    "ambulance": 5,
    "pedestrian": 6
}

def generate_test_set():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    images_test_dir = os.path.join(base_dir, "images", "test")
    labels_test_dir = os.path.join(base_dir, "labels", "test")
    
    os.makedirs(images_test_dir, exist_ok=True)
    os.makedirs(labels_test_dir, exist_ok=True)

    backend_dir = os.path.abspath(os.path.join(base_dir, ".."))
    videos_dir = os.path.join(backend_dir, "videos")
    detections_file = os.path.join(backend_dir, "app", "detections_data.json")

    if not os.path.exists(detections_file):
        print(f"[ERROR] Detections file not found: {detections_file}")
        return

    with open(detections_file, "r", encoding="utf-8") as f:
        detections_data = json.load(f)

    # Sample time offsets for each lane to create diverse test images
    sample_times = [0.0, 1.5, 3.0, 5.0]

    for lane_id in range(1, 5):
        lane_str = str(lane_id)
        video_path = os.path.join(videos_dir, f"lane{lane_id}.mp4")
        if not os.path.exists(video_path):
            print(f"[WARN] Video {video_path} not found.")
            continue

        cap = cv2.VideoCapture(video_path)
        fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

        lane_steps = detections_data.get(lane_str, {}).get("steps", [])

        for idx, t in enumerate(sample_times):
            frame_num = min(total_frames - 1, int(t * fps))
            cap.set(cv2.CAP_PROP_POS_FRAMES, frame_num)
            ret, frame = cap.read()
            if not ret:
                continue

            file_stem = f"lane_{lane_id}_test_frame_{idx + 1:03d}"
            img_path = os.path.join(images_test_dir, f"{file_stem}.jpg")
            label_path = os.path.join(labels_test_dir, f"{file_stem}.txt")

            # Save test image
            cv2.imwrite(img_path, frame)

            # Find matching step in detections_data.json
            matching_step = None
            for s in lane_steps:
                if abs(s.get("time", 0.0) - t) < 0.3:
                    matching_step = s
                    break
            if not matching_step and lane_steps:
                matching_step = lane_steps[min(idx, len(lane_steps) - 1)]

            # Generate YOLO-format annotation lines: <class_id> <cx> <cy> <w> <h>
            yolo_lines = []
            if matching_step:
                for d in matching_step.get("detections", []):
                    cls_name = d.get("vehicle_class", "car")
                    cls_id = CLASS_MAP.get(cls_name, 0)

                    bx = d.get("bbox_x", 0.0)
                    by = d.get("bbox_y", 0.0)
                    bw = d.get("bbox_w", 0.0)
                    bh = d.get("bbox_h", 0.0)

                    cx = min(1.0, max(0.0, bx + bw / 2.0))
                    cy = min(1.0, max(0.0, by + bh / 2.0))
                    w = min(1.0, max(0.0, bw))
                    h = min(1.0, max(0.0, bh))

                    yolo_lines.append(f"{cls_id} {cx:.4f} {cy:.4f} {w:.4f} {h:.4f}")

            with open(label_path, "w", encoding="utf-8") as lf:
                lf.write("\n".join(yolo_lines) + "\n")

            print(f"[TEST SET] Created: images/test/{file_stem}.jpg & labels/test/{file_stem}.txt ({len(yolo_lines)} objects)")

        cap.release()

    print("\n[SUCCESS] Test set directory populated at backend/dataset/images/test/ and backend/dataset/labels/test/")

if __name__ == "__main__":
    generate_test_set()
