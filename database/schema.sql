-- UrbanPulse Smart Traffic Management System Schema
-- PostgreSQL 15+ Schema Definition with Strict Types & Constraints

DROP TABLE IF EXISTS decision_log CASCADE;
DROP TABLE IF EXISTS evaluation_metrics CASCADE;
DROP TABLE IF EXISTS violations CASCADE;
DROP TABLE IF EXISTS predictions CASCADE;
DROP TABLE IF EXISTS density_history CASCADE;
DROP TABLE IF EXISTS detections CASCADE;
DROP TABLE IF EXISTS lanes CASCADE;

-- 1. Lanes Table
CREATE TABLE lanes (
    id SERIAL PRIMARY KEY,
    lane_number INTEGER NOT NULL UNIQUE,
    current_state VARCHAR(10) NOT NULL CHECK (current_state IN ('red', 'yellow', 'green')),
    density_percent DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    queue_count INTEGER NOT NULL DEFAULT 0,
    is_ambulance_detected BOOLEAN NOT NULL DEFAULT FALSE,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Detections Table
CREATE TABLE detections (
    id SERIAL PRIMARY KEY,
    lane_id INTEGER NOT NULL REFERENCES lanes(id) ON DELETE CASCADE,
    vehicle_class VARCHAR(30) NOT NULL CHECK (vehicle_class IN ('car', 'bike', 'auto-rickshaw', 'bus', 'truck', 'ambulance')),
    confidence_score DOUBLE PRECISION NOT NULL,
    bbox_x DOUBLE PRECISION NOT NULL,
    bbox_y DOUBLE PRECISION NOT NULL,
    bbox_w DOUBLE PRECISION NOT NULL,
    bbox_h DOUBLE PRECISION NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Density History Table
CREATE TABLE density_history (
    id SERIAL PRIMARY KEY,
    lane_id INTEGER NOT NULL REFERENCES lanes(id) ON DELETE CASCADE,
    density_percent DOUBLE PRECISION NOT NULL,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Predictions Table
CREATE TABLE predictions (
    id SERIAL PRIMARY KEY,
    lane_id INTEGER NOT NULL REFERENCES lanes(id) ON DELETE CASCADE,
    predicted_density DOUBLE PRECISION NOT NULL,
    prediction_horizon_seconds INTEGER NOT NULL,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Violations Table
CREATE TABLE violations (
    id SERIAL PRIMARY KEY,
    lane_id INTEGER NOT NULL REFERENCES lanes(id) ON DELETE CASCADE,
    plate_number VARCHAR(20) NOT NULL,
    confidence_score DOUBLE PRECISION NOT NULL,
    violation_type VARCHAR(50) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Evaluation Metrics Table
CREATE TABLE evaluation_metrics (
    id SERIAL PRIMARY KEY,
    metric_name VARCHAR(50) NOT NULL UNIQUE,
    value DOUBLE PRECISION NOT NULL,
    unit VARCHAR(20) NOT NULL,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Decision Log Table
CREATE TABLE decision_log (
    id SERIAL PRIMARY KEY,
    lane_id INTEGER NOT NULL REFERENCES lanes(id) ON DELETE CASCADE,
    rule_triggered VARCHAR(50) NOT NULL CHECK (rule_triggered IN ('emergency', 'predictive', 'density', 'fairness')),
    action_taken TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indices for performance
CREATE INDEX idx_detections_lane ON detections(lane_id);
CREATE INDEX idx_density_history_lane ON density_history(lane_id, recorded_at);
CREATE INDEX idx_predictions_lane ON predictions(lane_id, generated_at);
CREATE INDEX idx_violations_timestamp ON violations(timestamp);
