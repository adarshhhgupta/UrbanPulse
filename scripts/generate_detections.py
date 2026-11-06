"""
UrbanPulse - Unified Perception Pre-computation & Benchmark Sync
Uses the exact same unified video_processor engine to generate calibrated
reference telemetry tracks for default/demo playback.
"""

import os
import sys
import json

# Add backend directory to python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))
from app.video_processor import process_uploaded_video

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
FRONTEND_JSON = os.path.join(ROOT_DIR, "frontend", "public", "videos", "detections_data.json")
BACKEND_JSON = os.path.join(ROOT_DIR, "backend", "app", "detections_data.json")

def main():
    print("Ingesting benchmark videos using unified video_processor pipeline...")
    all_lanes = {}

    lane_configs = [
        (1, "Lane 1 (Northbound)", os.path.join(ROOT_DIR, "frontend", "public", "videos", "lane1.mp4"), False),
        (2, "Lane 2 (Eastbound)", os.path.join(ROOT_DIR, "frontend", "public", "videos", "lane2.mp4"), False),
        (3, "Lane 3 (Southbound)", os.path.join(ROOT_DIR, "frontend", "public", "videos", "lane3.mp4"), False),
        (4, "Lane 4 (Westbound)", os.path.join(ROOT_DIR, "frontend", "public", "videos", "lane4.mp4"), False),
    ]

    for lid, lname, vpath, is_amb in lane_configs:
        if not os.path.exists(vpath):
            print(f"Warning: {vpath} does not exist. Skipping.")
            continue
        print(f"\n--- Processing Lane {lid}: {os.path.basename(vpath)} ---")
        res = process_uploaded_video(
            lane_id=lid,
            video_filepath=vpath,
            original_filename=os.path.basename(vpath),
            manual_ambulance=is_amb,
            sample_interval=0.5,
            max_frames_to_sample=40
        )
        all_lanes[str(lid)] = res
        print(f"Lane {lid} result: queue={res['queue_count']}, density={res['density_percent']}%, amb={res['is_ambulance_detected']}, green={res['allocated_green_seconds']}s")
        print(f"Breakdown: {res['vehicle_breakdown']}")

    # Save to frontend public videos
    os.makedirs(os.path.dirname(FRONTEND_JSON), exist_ok=True)
    with open(FRONTEND_JSON, "w", encoding="utf-8") as f:
        json.dump(all_lanes, f, indent=2)
    print(f"\nSaved {FRONTEND_JSON} ({os.path.getsize(FRONTEND_JSON)} bytes)")

    # Save to backend app
    os.makedirs(os.path.dirname(BACKEND_JSON), exist_ok=True)
    with open(BACKEND_JSON, "w", encoding="utf-8") as f:
        json.dump(all_lanes, f, indent=2)
    print(f"Saved {BACKEND_JSON} ({os.path.getsize(BACKEND_JSON)} bytes)")

if __name__ == "__main__":
    main()
