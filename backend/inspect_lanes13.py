import json

with open('backend/app/detections_data.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

print("=== Lane 1 (Step 0) ===")
for d in data['1']['steps'][0]['detections']:
    print(f"{d['vehicle_class']:15} conf={d['confidence_score']:.2f} x={d['bbox_x']:.3f} y={d['bbox_y']:.3f} w={d['bbox_w']:.3f} h={d['bbox_h']:.3f}")

print("\n=== Lane 3 (Step 0) ===")
for d in data['3']['steps'][0]['detections']:
    print(f"{d['vehicle_class']:15} conf={d['confidence_score']:.2f} x={d['bbox_x']:.3f} y={d['bbox_y']:.3f} w={d['bbox_w']:.3f} h={d['bbox_h']:.3f}")
