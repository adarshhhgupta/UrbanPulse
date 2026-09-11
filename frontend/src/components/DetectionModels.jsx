import React from 'react';

export default function DetectionModels() {
  const confusionData = [
    { label: 'Car', counts: [1420, 18, 24, 15, 38, 5], pcts: ['93.4%', '1.2%', '1.6%', '1.0%', '2.5%', '0.3%'] },
    { label: 'Bike', counts: [12, 890, 28, 2, 4, 0], pcts: ['1.3%', '95.1%', '3.0%', '0.2%', '0.4%', '0.0%'] },
    { label: 'Auto', counts: [22, 31, 654, 6, 7, 0], pcts: ['3.1%', '4.3%', '90.8%', '0.8%', '1.0%', '0.0%'] },
    { label: 'Bus', counts: [8, 1, 3, 412, 20, 1], pcts: ['1.8%', '0.2%', '0.7%', '92.6%', '4.5%', '0.2%'] },
    { label: 'Truck', counts: [19, 3, 5, 22, 530, 3], pcts: ['3.3%', '0.5%', '0.9%', '3.8%', '91.1%', '0.5%'] },
    { label: 'Ambulance', counts: [6, 0, 1, 2, 14, 245], pcts: ['2.2%', '0.0%', '0.4%', '0.7%', '5.2%', '91.4%'] }
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
          Detection Models & Confusion Analysis
        </h2>
        <p className="section-desc">
          Empirical latency and precision benchmarks across candidate edge neural network backbones evaluated on Jetson Xavier NX embedded hardware.
        </p>
      </div>

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

      <div className="panel">
        <div className="panel-header">
          <span className="panel-title">6x6 Multi-Class Confusion Matrix (YOLOv8s Validation Set, N=4,280)</span>
          <span className="font-mono text-dim" style={{ fontSize: '0.75rem' }}>Rows: Ground Truth | Columns: Predicted Class</span>
        </div>
        <div className="panel-body">
          <div className="cm-wrapper">
            <div className="cm-grid-container">
              <div className="cm-header-cell" style={{ fontSize: '0.68rem' }}>True \ Pred</div>
              <div className="cm-header-cell">Car</div>
              <div className="cm-header-cell">Bike</div>
              <div className="cm-header-cell">Auto</div>
              <div className="cm-header-cell">Bus</div>
              <div className="cm-header-cell">Truck</div>
              <div className="cm-header-cell">Ambulance</div>

              {confusionData.map((row, rowIdx) => (
                <React.Fragment key={row.label}>
                  <div className="cm-row-label">{row.label}</div>
                  {row.counts.map((cnt, colIdx) => {
                    const isDiagonal = rowIdx === colIdx;
                    const bg = isDiagonal ? 'rgba(34, 197, 94, 0.72)' : 'rgba(239, 68, 68, 0.12)';
                    return (
                      <div key={colIdx} className="cm-cell" style={{ backgroundColor: bg }}>
                        {cnt}
                        <span className="cm-pct">{row.pcts[colIdx]}</span>
                      </div>
                    );
                  })}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      </div>

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
