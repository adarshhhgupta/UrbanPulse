import React from 'react';

export default function DetectionModels() {
  const classPerformanceMetrics = [
    { class_name: 'Car', precision: '94.8%', recall: '93.4%', f1_score: '94.1%', map_05: '95.2%', sample_size: 1520, status: 'Optimal', status_class: 'badge-best' },
    { class_name: 'Bike', precision: '93.2%', recall: '95.1%', f1_score: '94.1%', map_05: '93.8%', sample_size: 936, status: 'Optimal', status_class: 'badge-best' },
    { class_name: 'Auto-Rickshaw', precision: '91.4%', recall: '90.8%', f1_score: '91.1%', map_05: '91.6%', sample_size: 720, status: 'Calibrated', status_class: 'badge-best' },
    { class_name: 'Bus', precision: '92.6%', recall: '92.6%', f1_score: '92.6%', map_05: '93.1%', sample_size: 445, status: 'Optimal', status_class: 'badge-best' },
    { class_name: 'Truck', precision: '90.1%', recall: '91.1%', f1_score: '90.6%', map_05: '90.8%', sample_size: 582, status: 'Calibrated', status_class: 'badge-best' },
    { class_name: 'Ambulance', precision: '96.2%', recall: '91.4%', f1_score: '93.7%', map_05: '94.5%', sample_size: 268, status: 'Emergency Priority', status_class: 'badge-heavy' },
    { class_name: 'Pedestrian', precision: '92.5%', recall: '89.6%', f1_score: '91.0%', map_05: '90.4%', sample_size: 615, status: 'VRU Protected', status_class: 'badge-suboptimal' }
  ];

  return (
    <section id="detection-models">
      <div className="section-header">
        <div className="section-tag">Computer Vision Benchmark & Verification</div>
        <h2 className="section-title">
          <svg className="icon text-blue" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" />
            <line x1="22" y1="12" x2="18" y2="12" />
            <line x1="6" y1="12" x2="2" y2="12" />
            <line x1="12" y1="6" x2="12" y2="2" />
            <line x1="12" y1="22" x2="12" y2="18" />
          </svg>
          Detection Models & Edge Inference Benchmark
        </h2>
        <p className="section-desc">
          Empirical latency, throughput, and class precision benchmarks across candidate edge neural network backbones evaluated on Jetson Xavier NX embedded hardware.
        </p>
      </div>

      {/* Model Architecture Comparison */}
      <div className="panel">
        <div className="panel-header">
          <span className="panel-title">Model Architecture Comparison Benchmark</span>
          <span className="font-mono text-dim" style={{ fontSize: '0.75rem' }}>FP16 TensorRT on NVIDIA Jetson Xavier NX</span>
        </div>
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Model</th>
                <th>Speed (FPS)</th>
                <th>mAP@0.5</th>
                <th>Real-Time Suitability</th>
                <th>Engineering Justification & Notes</th>
              </tr>
            </thead>
            <tbody>
              <tr className="highlight-row">
                <td><strong>YOLOv8s (Selected)</strong></td>
                <td className="font-mono text-green"><strong>42.1 FPS</strong></td>
                <td className="font-mono text-green"><strong>91.3%</strong></td>
                <td><span className="badge-best">Optimal</span></td>
                <td>Anchor-free head delivers superior small-vehicle recall and fastest inference per quad-stream channel.</td>
              </tr>
              <tr>
                <td>YOLOv5s</td>
                <td className="font-mono">38.4 FPS</td>
                <td className="font-mono">87.6%</td>
                <td><span className="badge-best">Viable</span></td>
                <td>Anchor-based regression yields higher localization loss on dense auto-rickshaw clusters.</td>
              </tr>
              <tr>
                <td>YOLO-NAS-S</td>
                <td className="font-mono">31.2 FPS</td>
                <td className="font-mono">89.8%</td>
                <td><span className="badge-suboptimal">Marginal</span></td>
                <td>Neural architecture search model achieves solid mAP but exceeds GPU VRAM ceiling when 4 feeds run concurrently.</td>
              </tr>
              <tr>
                <td>Faster R-CNN (ResNet-50)</td>
                <td className="font-mono text-red">7.8 FPS</td>
                <td className="font-mono text-green">93.2%</td>
                <td><span className="badge-heavy">Too Slow</span></td>
                <td>Two-stage region proposal generates excessive latency (&gt;125ms per frame), rendering real-time actuation unsafe.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Replaced Confusion Matrix: Per-Class Precision & Recall Breakdown */}
      <div className="panel">
        <div className="panel-header">
          <span className="panel-title">Per-Class Detection Performance & Precision Metrics (YOLOv8s Validation Set)</span>
          <span className="font-mono text-dim" style={{ fontSize: '0.75rem' }}>Empirical Test Benchmark Across All 7 Traffic Classes (N = 5,086)</span>
        </div>
        <div className="panel-body">
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Vehicle / Entity Class</th>
                  <th>Precision (P)</th>
                  <th>Recall (R)</th>
                  <th>F1-Score</th>
                  <th>mAP@0.5</th>
                  <th>Validation Samples</th>
                  <th>System Status</th>
                </tr>
              </thead>
              <tbody>
                {classPerformanceMetrics.map((row) => (
                  <tr key={row.class_name}>
                    <td><strong style={{ color: '#fff' }}>{row.class_name}</strong></td>
                    <td className="font-mono text-green">{row.precision}</td>
                    <td className="font-mono text-green">{row.recall}</td>
                    <td className="font-mono">{row.f1_score}</td>
                    <td className="font-mono text-green"><strong>{row.map_05}</strong></td>
                    <td className="font-mono text-dim">{row.sample_size.toLocaleString()}</td>
                    <td><span className={row.status_class}>{row.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Ambulance Dual Mitigation Card */}
      <div className="dual-model-card">
        <h4 style={{ color: '#f1f5f9', marginBottom: '0.5rem', fontSize: '0.95rem' }}>
          Ambulance Detection Challenges & Dual Mitigation Architecture
        </h4>
        <p>
          Standard public benchmark datasets (such as MS COCO) do not provide a discrete "ambulance" class, requiring specialized transfer learning.
          Visually, ambulances share identical chassis silhouettes with commercial delivery vans and utility trucks, distinguished only by livery
          markings (red cross/crescents) and rooftop emergency siren bars.
        </p>
        <p>
          To ensure fail-safe emergency transit, UrbanPulse evaluated two primary mitigation strategies:
          <br />
          &bull; <strong>Option A (Direct Fine-Tuning):</strong> Fine-tuning YOLOv8 directly on curated Roboflow open ambulance datasets augmented with regional emergency vehicle liveries.
          <br />
          &bull; <strong>Option B (Two-Stage Cascade):</strong> A general vehicle detector triggers a secondary lightweight CNN classifier focusing strictly on cropped vehicle roofs to confirm flashing strobe beacon geometry.
          <br />
          Furthermore, an acoustic <strong>siren audio detection fusion</strong> module (using Mel-spectrograms in librosa) acts as a secondary confirmation channel during night or severe downpour conditions when visual confidence drops.
        </p>
      </div>
    </section>
  );
}
