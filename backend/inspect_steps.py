import json

with open('frontend/public/videos/detections_data.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

for lane in ['2', '4']:
    print(f"\n================ LANE {lane} STEPS ================")
    for step_idx in [0, 5, 10, 15]:
        if step_idx < len(data[lane]['steps']):
            step = data[lane]['steps'][step_idx]
            print(f"\n--- Step {step_idx} (time: {step['time']}s, total: {len(step['detections'])}) ---")
            for d in step['detections']:
                cls = d['vehicle_class']
                conf = d.get('confidence_score', 0)
                x, y, w, h = d['bbox_x'], d['bbox_y'], d['bbox_w'], d['bbox_h']
                if lane == '4' and x < 0.5:
                    print(f"  {cls:15} conf={conf:.2f} | x={x:.3f}, y={y:.3f}, w={w:.3f}, h={h:.3f}")
                elif lane == '2' and ('truck' in cls or x > 0.8 or (0.5 < x < 0.7 and 0.4 < y < 0.6)):
                    print(f"  {cls:15} conf={conf:.2f} | x={x:.3f}, y={y:.3f}, w={w:.3f}, h={h:.3f}")
