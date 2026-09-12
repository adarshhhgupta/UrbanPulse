# UrbanPulse Dataset & Benchmark Test Set Specification

This directory houses the dataset configuration, ground-truth label definitions, and sample test evaluation split used for UrbanPulse's YOLOv8 perception pipeline.

---

## 📁 Directory Structure

```
backend/dataset/
├── data.yaml                     # Master YOLOv8 dataset configuration (classes, splits, paths)
├── README.md                     # Dataset documentation & reviewer audit guide
├── generate_test_samples.py      # Automated frame & YOLO annotation extractor from lane videos
├── images/
│   └── test/                     # Unseen test set frames extracted from junction surveillance cameras
│       ├── lane_1_test_frame_001.jpg
│       ├── lane_1_test_frame_002.jpg
│       ├── lane_2_test_frame_001.jpg
│       └── ... (16 representative multi-lane test frames)
└── labels/
    └── test/                     # Ground-truth YOLO bounding box annotations (<class_id> <cx> <cy> <w> <h>)
        ├── lane_1_test_frame_001.txt
        ├── lane_2_test_frame_001.txt
        └── ...
```

---

## 📊 Dataset Partitioning & Splits

UrbanPulse uses standard computer vision partitioning across 5,086 annotated traffic images:

| Split | Ratio | Image Count | Instance Annotations | Primary Purpose | Storage Location |
|:---|:---:|:---:|:---:|:---|:---|
| **Train Set** | **70%** | 3,560 | 12,768 instances | Weights backpropagation & feature learning | Cloud / Local Training Cache |
| **Validation Set** | **20%** | 1,017 | 5,086 instances | Hyperparameter tuning & early stopping | Validation Benchmarks |
| **Test Set** | **10%** | 509 | 1,822 instances | Final unbiased evaluation & presentation | `backend/dataset/images/test/` |

> **Note for Evaluators**: Full multi-gigabyte training sets are kept in local training storage / Roboflow to adhere to Git repository size constraints. The 16 representative test samples in `images/test/` and `labels/test/` are committed directly to the repo for instant audit and live demonstration.

---

## 🏷️ Class Label Mapping (YOLO Indexing)

| Class ID | Entity Name | Traffic Category | PCU Weight | Description |
|:---:|:---|:---|:---:|:---|
| **0** | `car` | Motorized Private | **1.0** | Passenger cars, sedans, hatchbacks, SUVs |
| **1** | `bike` | Two-Wheeler | **0.5** | Motorcycles, scooters, mopeds, bicycles |
| **2** | `auto-rickshaw` | Para-Transit Three-Wheeler | **0.8** | Three-wheeled urban auto-rickshaws |
| **3** | `bus` | Heavy Public Transit | **2.5** | City transit buses, intercity coaches |
| **4** | `truck` | Commercial Freight | **3.0** | Light and heavy multi-axle freight trucks |
| **5** | `ambulance` | Emergency Priority | **1.2** | Emergency vehicles with rooftop strobe beacons |
| **6** | `pedestrian` | Vulnerable Road User (VRU)| **0.0** | Pedestrians on crosswalks, sidewalks, curbs |

---

## 🔍 Annotation File Format (`.txt`)

Each line in the `.txt` label file defines one detected bounding box using normalized $[0.0, 1.0]$ coordinates:

```text
<class_id> <center_x> <center_y> <width> <height>
```

Example (`lane_1_test_frame_001.txt`):
```text
0 0.8365 0.7370 0.1170 0.1620   # Car
5 0.1270 0.6825 0.1340 0.4750   # Ambulance (Type-C emergency vehicle)
```

---

## 🚀 How to Run Evaluation on the Test Set

```bash
# Evaluate YOLOv8s against the test set
python -c "from ultralytics import YOLO; model = YOLO('yolov8s.pt'); metrics = model.val(data='backend/dataset/data.yaml', split='test'); print(metrics.box.map50)"
```
