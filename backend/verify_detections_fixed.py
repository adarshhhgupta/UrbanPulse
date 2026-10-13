import json

with open('frontend/public/videos/detections_data.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

print("=== VERIFYING LANE 4 ===")
lane4_classes = set()
for step in data['4']['steps']:
    for d in step['detections']:
        lane4_classes.add(d['vehicle_class'])
print("Classes present in Lane 4 across all steps:", lane4_classes)

print("\n=== VERIFYING LANE 2 ===")
lane2_classes = set()
for step in data['2']['steps']:
    for d in step['detections']:
        lane2_classes.add(d['vehicle_class'])
print("Classes present in Lane 2 across all steps:", lane2_classes)

print("\n=== DETAILED LANE 4 SAMPLES ===")
for s_idx in [0, 5, 10, 15]:
    if s_idx < len(data['4']['steps']):
        step = data['4']['steps'][s_idx]
        t = step['time']
        print(f"\nStep {s_idx} (t={t}s, total={len(step['detections'])}):")
        for d in step['detections']:
            print(f"  {d['vehicle_class']:15} conf={d['confidence_score']:.2f} | x={d['bbox_x']:.3f}, y={d['bbox_y']:.3f}, w={d['bbox_w']:.3f}, h={d['bbox_h']:.3f}")
