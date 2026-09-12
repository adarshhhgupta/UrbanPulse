"""
UrbanPulse - YOLOv8 Multi-Class Model Training Script
Performs transfer learning and domain fine-tuning on YOLOv8s using data.yaml.
Trains detection across 7 traffic entities: car, bike, auto-rickshaw, bus, truck, ambulance, pedestrian.
"""

import os
from ultralytics import YOLO

def train_urbanpulse_yolo():
    print("=" * 70)
    print(" UrbanPulse YOLOv8s Training & Validation Pipeline")
    print("=" * 70)

    # 1. Path to dataset YAML configuration
    dataset_yaml = os.path.join(os.path.dirname(__file__), "dataset", "data.yaml")
    
    # 2. Initialize pre-trained YOLOv8s checkpoint (Transfer Learning baseline)
    model = YOLO("yolov8s.pt")
    
    # 3. Training Hyperparameters
    # - epochs: 100 with early stopping patience of 15
    # - imgsz: 640x640 resolution
    # - batch: 16
    # - optimizer: AdamW with cosine learning rate schedule
    # - lr0: 0.001 initial learning rate
    # - lrf: 0.01 final learning rate factor (cosine decay)
    # - augment: True (Mosaic, MixUp, HSV jitter, horizontal flip)
    print(f"\n[1/3] Loading dataset from: {dataset_yaml}")
    print("[2/3] Initiating Transfer Learning from pre-trained COCO backbone (yolov8s.pt)...")
    
    results = model.train(
        data=dataset_yaml,
        epochs=100,
        patience=15,
        imgsz=640,
        batch=16,
        optimizer="AdamW",
        lr0=0.001,
        lrf=0.01,
        weight_decay=0.0005,
        warmup_epochs=3,
        augment=True,
        mosaic=1.0,
        degrees=10.0,
        translate=0.1,
        scale=0.5,
        fliplr=0.5,
        save=True,
        project="runs/urbanpulse_detect",
        name="yolov8s_traffic_v1",
        verbose=True
    )

    # 4. Evaluate on the Validation Split Set
    print("\n[3/3] Evaluating Model on Validation Set (images/val)...")
    val_metrics = model.val(data=dataset_yaml, split="val")
    
    print("\n" + "=" * 70)
    print(" Validation Set Accuracy Summary:")
    print("=" * 70)
    print(f" Mean Average Precision (mAP@0.5)     : {val_metrics.box.map50 * 100:.2f}%")
    print(f" Mean Average Precision (mAP@0.5:0.95): {val_metrics.box.map * 100:.2f}%")
    print(f" Precision (P)                        : {val_metrics.box.mp * 100:.2f}%")
    print(f" Recall (R)                           : {val_metrics.box.mr * 100:.2f}%")
    print("=" * 70)

    # 5. Export fine-tuned weights for Edge Deployment (NVIDIA TensorRT / ONNX)
    model.export(format="engine", half=True)  # FP16 TensorRT for Jetson Xavier NX
    print("[EXPORT] Exported trained model to FP16 TensorRT engine for edge deployment.\n")

if __name__ == "__main__":
    train_urbanpulse_yolo()
