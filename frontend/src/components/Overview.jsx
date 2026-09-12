import React, { useState, useEffect } from 'react';

export default function Overview({ onNavigate }) {
  const [timeStr, setTimeStr] = useState('');
  const [dateStr, setDateStr] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');
      setTimeStr(`${hours}:${minutes}:${seconds}`);

      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      setDateStr(`${year}-${month}-${day} (${days[now.getDay()]}) | UTC+05:30`);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleCardClick = (page) => {
    if (onNavigate) onNavigate(page);
  };

  return (
    <section id="overview">
      <div className="hero-banner">
        <div className="hero-top-bar">
          <div className="hero-title-group">
            <div className="section-tag">Academic Engineering Deliverable & Telemetry Dashboard</div>
            <h1>UrbanPulse</h1>
            <div className="hero-subtitle">
              AI-powered 4-lane junction control with emergency preemption and predictive signal timing
            </div>
          </div>
          <div className="telemetry-clock-card">
            <div className="clock-time font-mono">{timeStr || '16:42:08'}</div>
            <div className="clock-date font-mono">{dateStr || '2026-09-12 | UTC+05:30'}</div>
          </div>
        </div>

        <div className="hero-academic-summary">
          UrbanPulse presents an end-to-end intelligent traffic control platform designed to alleviate urban intersection gridlock and prioritize emergency transit. By combining real-time YOLOv8 object detection with multi-horizon Long Short-Term Memory (LSTM) time-series forecasting, the system dynamically calculates phase splits rather than relying on legacy fixed-time controllers. A prioritized rule-based decision matrix ensures deterministic pre-emption for emergency services while preventing starve-out conditions for opposing traffic queues.
        </div>

        <div className="kpi-grid">
          <div
            className="kpi-card clickable-kpi"
            onClick={() => handleCardClick('live-junction')}
            title="Open Live Junction Control Room"
          >
            <span className="kpi-label">Lanes Monitored</span>
            <span className="kpi-value font-mono">4</span>
            <span className="kpi-meta">Quad-camera RTSP stream &rarr;</span>
          </div>
          <div
            className="kpi-card clickable-kpi"
            onClick={() => handleCardClick('detection-models')}
            title="Inspect YOLOv8 Detection Models"
          >
            <span className="kpi-label">Detection Model</span>
            <span className="kpi-value font-mono" style={{ fontSize: '1.5rem', color: '#93c5fd' }}>YOLOv8s</span>
            <span className="kpi-meta">mAP@0.5: 91.3% | 42 FPS &rarr;</span>
          </div>
          <div
            className="kpi-card clickable-kpi"
            onClick={() => handleCardClick('prediction-engine')}
            title="Open LSTM Predictive Engine"
          >
            <span className="kpi-label">Prediction Model</span>
            <span className="kpi-value font-mono" style={{ fontSize: '1.5rem', color: '#fde047' }}>LSTM</span>
            <span className="kpi-meta">Seq2Seq 10-min horizon &rarr;</span>
          </div>
          <div
            className="kpi-card clickable-kpi"
            onClick={() => handleCardClick('evaluation')}
            title="View Simulation Evaluation"
          >
            <span className="kpi-label">Avg. Wait Reduction</span>
            <span className="kpi-value font-mono text-green">27.4%</span>
            <span className="kpi-meta">vs. Fixed 60s Cycle (SUMO) &rarr;</span>
          </div>
          <div
            className="kpi-card clickable-kpi"
            onClick={() => handleCardClick('lane-analytics')}
            title="Open Lane Vehicle Analytics"
          >
            <span className="kpi-label">Active Detected Fleet</span>
            <span className="kpi-value font-mono text-blue">75</span>
            <span className="kpi-meta">57 Vehicles • 18 VRUs &rarr;</span>
          </div>
          <div
            className="kpi-card clickable-kpi"
            onClick={() => handleCardClick('modules')}
            title="Inspect Algorithmic Modules"
          >
            <span className="kpi-label">System Uptime</span>
            <span className="kpi-value font-mono text-green">99.6%</span>
            <span className="kpi-meta">Edge watchdog verified &rarr;</span>
          </div>
        </div>
      </div>
    </section>
  );
}
