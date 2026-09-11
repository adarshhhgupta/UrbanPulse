import React from 'react';

export default function Architecture() {
  return (
    <section id="architecture">
      <div className="section-header">
        <div className="section-tag">System Pipeline & Specifications</div>
        <h2 className="section-title">
          <svg className="icon text-blue" viewBox="0 0 24 24">
            <polyline points="16 18 22 12 16 6" />
            <polyline points="8 6 2 12 8 18" />
          </svg>
          System Architecture
        </h2>
        <p className="section-desc">
          Complete hardware-software pipeline showing frame acquisition from pre-recorded footage, spatial object detection,
          dual-mode density estimation, temporal queue forecasting, and deterministic priority actuation.
        </p>
      </div>

      {/* Responsive Horizontal/Vertical Pipeline Flow */}
      <div className="pipeline-container">
        <div className="pipe-node">
          <span className="pipe-node-header">Stage 01</span>
          <span className="pipe-node-title">4x Video Feed</span>
          <span className="pipe-node-badge">Pre-recorded Placeholders</span>
        </div>
        <div className="pipe-arrow">
          <svg className="icon icon-sm" viewBox="0 0 24 24"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
        </div>
        <div className="pipe-node">
          <span className="pipe-node-header">Stage 02</span>
          <span className="pipe-node-title">Frame Extraction</span>
          <span className="pipe-node-badge">8 FPS (5–10 FPS Budget)</span>
        </div>
        <div className="pipe-arrow">
          <svg className="icon icon-sm" viewBox="0 0 24 24"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
        </div>
        <div className="pipe-node">
          <span className="pipe-node-header">Stage 03</span>
          <span className="pipe-node-title">YOLOv8 Detection</span>
          <span className="pipe-node-badge">6 Target Classes</span>
        </div>
        <div className="pipe-arrow">
          <svg className="icon icon-sm" viewBox="0 0 24 24"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
        </div>
        <div className="pipe-node">
          <span className="pipe-node-header">Stage 04</span>
          <span className="pipe-node-title">Density Estimation</span>
          <span className="pipe-node-badge">PCU + Motion Fallback</span>
        </div>
        <div className="pipe-arrow">
          <svg className="icon icon-sm" viewBox="0 0 24 24"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
        </div>
        <div className="pipe-node">
          <span className="pipe-node-header">Stage 05</span>
          <span className="pipe-node-title">LSTM Prediction</span>
          <span className="pipe-node-badge">vs. ARIMA Baseline</span>
        </div>
        <div className="pipe-arrow">
          <svg className="icon icon-sm" viewBox="0 0 24 24"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
        </div>
        <div className="pipe-node">
          <span className="pipe-node-header">Stage 06</span>
          <span className="pipe-node-title">Decision Engine</span>
          <span className="pipe-node-badge">4-Tier Priority Rules</span>
        </div>
        <div className="pipe-arrow">
          <svg className="icon icon-sm" viewBox="0 0 24 24"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
        </div>
        <div className="pipe-node">
          <span className="pipe-node-header">Stage 07</span>
          <span className="pipe-node-title">Signal Output</span>
          <span className="pipe-node-badge">Relay / PLC Actuation</span>
        </div>
      </div>

      <div className="arch-dual-model-grid">
        <div className="dual-model-card">
          <h3 style={{ marginBottom: '0.5rem', fontSize: '1.05rem' }}>
            Decoupled ML Architecture: Spatial Perception vs. Temporal Forecasting
          </h3>
          <p>
            UrbanPulse decouples <strong>spatial perception</strong> from <strong>temporal forecasting</strong> into two specialized models. The vision model (YOLOv8s) processes single frames at 8 FPS to locate bounding boxes across 6 domain classes.
          </p>
          <p>
            When visual confidence falls below 0.65 (due to night glare or monsoon spray), a <strong>frame-differencing / background-subtraction fallback</strong> path estimates queue occupancy. Historical Passenger Car Unit (PCU) densities are then passed to an <strong>LSTM sequence model</strong> that projects queue accumulation 10 minutes into the future to pre-emptively flush bottlenecks.
          </p>
          <div style={{ fontSize: '0.8rem', color: '#94a3b8', borderTop: '1px solid #232838', paddingTop: '0.5rem' }}>
            <em>Academic Note:</em> Live 4-camera physical capture is impractical for classroom/lab evaluation, so synchronized pre-recorded benchmark video loops are utilized as perception placeholders.
          </div>
        </div>

        <div className="tech-stack-panel">
          <h3 style={{ fontSize: '1.05rem', marginBottom: '0.25rem' }}>Core Technology Stack</h3>
          <span className="text-dim font-mono" style={{ fontSize: '0.75rem' }}>Engineering Frameworks & Libraries</span>
          <div className="tech-badge-container">
            <span className="tech-tag">YOLOv8 (Ultralytics)</span>
            <span className="tech-tag">OpenCV 4.8</span>
            <span className="tech-tag">PyTorch / TensorFlow</span>
            <span className="tech-tag">scikit-learn (ARIMA)</span>
            <span className="tech-tag">SUMO Simulator</span>
            <span className="tech-tag">EasyOCR</span>
            <span className="tech-tag">librosa (Audio CNN)</span>
            <span className="tech-tag">FastAPI (Python)</span>
            <span className="tech-tag">React 18 (Vite)</span>
          </div>
        </div>
      </div>
    </section>
  );
}
