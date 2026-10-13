d import json

with open('frontend/public/videos/detections_data.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

for lane in ['2', '4']:
    print(f"\n=== LANE {lane} STEP 0 DETECTIONS ===")
    step0 = data[lane]['steps'][0]['detections']
    for idx, d in enumerate(step0):
        cls = d['vehicle_class']
        conf = d.get('confidence_score', 0)
        x, y, w, h = d['bbox_x'], d['bbox_y'], d['bbox_w'], d['bbox_h']
        print(f"[{idx}] {cls:15} conf={conf:.2f} | x={x:.3f}, y={y:.3f}, w={w:.3f}, h={h:.3f}")
