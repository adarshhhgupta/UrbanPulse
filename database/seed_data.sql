-- UrbanPulse Seed Data matching Reference Scenario
-- PostgreSQL 15+ Compatible Seed Script

-- 1. Lanes Seed (Reference Scenario: Lane 1 green with ambulance, Lanes 2, 3, 4 overridden red)
INSERT INTO lanes (id, lane_number, current_state, density_percent, queue_count, is_ambulance_detected, last_updated) VALUES
(1, 1, 'green', 42.0, 6, TRUE, CURRENT_TIMESTAMP),
(2, 2, 'red', 82.0, 19, FALSE, CURRENT_TIMESTAMP),
(3, 3, 'red', 18.0, 3, FALSE, CURRENT_TIMESTAMP),
(4, 4, 'red', 55.0, 8, FALSE, CURRENT_TIMESTAMP);

SELECT setval('lanes_id_seq', (SELECT MAX(id) FROM lanes));

-- 2. Detections Seed (Real YOLOv8 Detections matching actual video frames)
INSERT INTO detections (lane_id, vehicle_class, confidence_score, bbox_x, bbox_y, bbox_w, bbox_h, timestamp) VALUES
-- Lane 1: Real emergency ambulance on left lane + trailing traffic
(1, 'ambulance', 0.98, 0.060, 0.445, 0.134, 0.475, CURRENT_TIMESTAMP),
(1, 'car', 0.94, 0.546, 0.644, 0.113, 0.193, CURRENT_TIMESTAMP),
(1, 'car', 0.92, 0.778, 0.656, 0.117, 0.162, CURRENT_TIMESTAMP),

-- Lane 2: Aerial arterial traffic (cars, auto-rickshaws, bus, motorcycle)
(2, 'bus', 0.92, 0.485, 0.410, 0.065, 0.185, CURRENT_TIMESTAMP),
(2, 'car', 0.94, 0.245, 0.535, 0.075, 0.125, CURRENT_TIMESTAMP),
(2, 'auto-rickshaw', 0.91, 0.380, 0.450, 0.055, 0.095, CURRENT_TIMESTAMP),
(2, 'bike', 0.89, 0.280, 0.650, 0.040, 0.090, CURRENT_TIMESTAMP),

-- Lane 3: Flyover slope (real red transit bus and cars)
(3, 'bus', 0.96, 0.209, 0.610, 0.214, 0.381, CURRENT_TIMESTAMP),
(3, 'car', 0.91, 0.483, 0.320, 0.063, 0.147, CURRENT_TIMESTAMP),
(3, 'car', 0.89, 0.445, 0.246, 0.059, 0.116, CURRENT_TIMESTAMP),

-- Lane 4: Ground level street (Black Mercedes, auto-rickshaws, scooters)
(4, 'car', 0.96, 0.488, 0.410, 0.191, 0.248, CURRENT_TIMESTAMP),
(4, 'auto-rickshaw', 0.94, 0.000, 0.430, 0.249, 0.357, CURRENT_TIMESTAMP),
(4, 'auto-rickshaw', 0.92, 0.220, 0.378, 0.212, 0.275, CURRENT_TIMESTAMP),
(4, 'auto-rickshaw', 0.90, 0.656, 0.362, 0.070, 0.176, CURRENT_TIMESTAMP);

SELECT setval('detections_id_seq', (SELECT MAX(id) FROM detections));

-- 3. Density History Seed (Last 30 minutes in 5-minute increments for Lane 4 and others)
INSERT INTO density_history (lane_id, density_percent, recorded_at) VALUES
-- Lane 4 progression: rising trend
(4, 25.0, CURRENT_TIMESTAMP - INTERVAL '30 minutes'),
(4, 28.0, CURRENT_TIMESTAMP - INTERVAL '25 minutes'),
(4, 30.0, CURRENT_TIMESTAMP - INTERVAL '20 minutes'),
(4, 36.0, CURRENT_TIMESTAMP - INTERVAL '15 minutes'),
(4, 42.0, CURRENT_TIMESTAMP - INTERVAL '10 minutes'),
(4, 48.0, CURRENT_TIMESTAMP - INTERVAL '5 minutes'),
(4, 55.0, CURRENT_TIMESTAMP),

-- Lane 2 progression: sustained heavy congestion
(2, 74.0, CURRENT_TIMESTAMP - INTERVAL '30 minutes'),
(2, 76.0, CURRENT_TIMESTAMP - INTERVAL '20 minutes'),
(2, 79.0, CURRENT_TIMESTAMP - INTERVAL '10 minutes'),
(2, 82.0, CURRENT_TIMESTAMP),

-- Lane 1 & 3 progression
(1, 40.0, CURRENT_TIMESTAMP - INTERVAL '10 minutes'),
(1, 42.0, CURRENT_TIMESTAMP),
(3, 16.0, CURRENT_TIMESTAMP - INTERVAL '10 minutes'),
(3, 18.0, CURRENT_TIMESTAMP);

SELECT setval('density_history_id_seq', (SELECT MAX(id) FROM density_history));

-- 4. Predictions Seed (LSTM forecast for Lane 4: +23% rise over next 90s reaching 78%)
INSERT INTO predictions (lane_id, predicted_density, prediction_horizon_seconds, generated_at) VALUES
(4, 78.0, 90, CURRENT_TIMESTAMP),
(1, 35.0, 300, CURRENT_TIMESTAMP),
(2, 86.0, 300, CURRENT_TIMESTAMP),
(3, 19.0, 300, CURRENT_TIMESTAMP);

SELECT setval('predictions_id_seq', (SELECT MAX(id) FROM predictions));

-- 5. Violations Seed (>= 6 realistic stop-line breach rows with realistic plate numbers)
INSERT INTO violations (lane_id, plate_number, confidence_score, violation_type, timestamp) VALUES
(2, 'KA-05-MJ-4821', 0.948, 'Red-Light Stop-Line Breach', CURRENT_TIMESTAMP - INTERVAL '3 minutes'),
(3, 'DL-01-AB-1204', 0.962, 'Red-Light Stop-Line Breach', CURRENT_TIMESTAMP - INTERVAL '7 minutes'),
(2, 'MH-12-TR-9082', 0.921, 'Full Junction Traversal on Red', CURRENT_TIMESTAMP - INTERVAL '14 minutes'),
(4, 'TN-09-BK-3319', 0.954, 'Red-Light Stop-Line Breach', CURRENT_TIMESTAMP - INTERVAL '26 minutes'),
(3, 'HR-26-DK-7711', 0.916, 'Illegal Left Turn on Red', CURRENT_TIMESTAMP - INTERVAL '39 minutes'),
(1, 'KA-03-HA-5542', 0.973, 'Red-Light Stop-Line Breach', CURRENT_TIMESTAMP - INTERVAL '53 minutes');

SELECT setval('violations_id_seq', (SELECT MAX(id) FROM violations));

-- 6. Evaluation Metrics Seed
INSERT INTO evaluation_metrics (metric_name, value, unit, recorded_at) VALUES
('detection_map_05', 91.3, '%', CURRENT_TIMESTAMP),
('prediction_rmse_lstm', 3.2, '%', CURRENT_TIMESTAMP),
('prediction_rmse_arima', 7.8, '%', CURRENT_TIMESTAMP),
('wait_time_reduction_percent', 27.4, '%', CURRENT_TIMESTAMP),
('ambulance_clearance_time_seconds', 8.2, 'seconds', CURRENT_TIMESTAMP);

SELECT setval('evaluation_metrics_id_seq', (SELECT MAX(id) FROM evaluation_metrics));

-- 7. Decision Log Seed (Emergency priority record)
INSERT INTO decision_log (lane_id, rule_triggered, action_taken, timestamp) VALUES
(1, 'emergency', 'AMBULANCE PRIORITY: Forced Lane 1 GREEN, overridden Lanes 2, 3, 4 to RED. Pre-emption signal dispatched to Junction 7 via MQTT.', CURRENT_TIMESTAMP),
(4, 'predictive', 'PREDICTIVE PRE-EMPTION: LSTM flagged +23% queue surge in next 90s. Extended green cycle scheduled.', CURRENT_TIMESTAMP - INTERVAL '5 minutes'),
(2, 'density', 'DYNAMIC PHASE: Allocated 52s green split based on 82% PCU queue index.', CURRENT_TIMESTAMP - INTERVAL '12 minutes'),
(3, 'fairness', 'STARVATION OVERRIDE: Lane 3 wait exceeded 120s limit. Forcing 20s clearance phase.', CURRENT_TIMESTAMP - INTERVAL '22 minutes');

SELECT setval('decision_log_id_seq', (SELECT MAX(id) FROM decision_log));
