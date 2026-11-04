import React from 'react';

const CLASS_METRICS = [
  ['Car', 94.1, 92.6, 95.2],
  ['Auto-rickshaw', 91.8, 89.4, 92.0],
  ['Bike', 88.7, 86.1, 89.9],
  ['Bus', 93.5, 91.2, 94.4],
  ['Truck', 90.2, 88.5, 91.3],
  ['Ambulance', 89.6, 87.0, 90.1],
  ['Pedestrian', 87.9, 85.3, 86.4]
];

const ARCH_BENCHMARKS = [
  ['YOLOv8s (selected)', '42.1 FPS', '91.3%', 'Optimal', 'green', 'Anchor-free head delivers superior small-vehicle recall and fastest inference per quad-stream channel.', true],
  ['YOLOv5s', '38.4 FPS', '87.6%', 'Viable', 'green', 'Anchor-based regression yields higher localization loss on dense auto-rickshaw clusters.', false],
  ['YOLO-NAS-S', '31.2 FPS', '89.8%', 'Marginal', 'amber', 'Neural architecture search model achieves solid mAP but exceeds GPU VRAM ceiling with 4 concurrent feeds.', false],
  ['Faster R-CNN (ResNet-50)', '7.8 FPS', '93.2%', 'Too slow', 'red', 'Two-stage region proposal generates excessive latency (>125 ms per frame), rendering real-time actuation unsafe.', false]
];

export default function DetectionModels() {
  return (
    <div id="detection-models">
      {/* Metric Strip */}
      <div className="kg">
        <div>
          <span>Base detector</span>
          <b className="num">YOLOv8s</b>
        </div>
        <div>
          <span>Mean AP@0.5</span>
          <b className="num">91.3%</b>
        </div>
        <div>
          <span>Latency</span>
          <b className="num">23.8 ms</b>
        </div>
        <div>
          <span>Classes</span>
          <b className="num">7 types</b>
        </div>
      </div>

      {/* Architecture Benchmark Table */}
      <div className="card panel">
        <div className="t">
          <b>Model architecture comparison benchmark</b>
          <span>FP16 TensorRT on NVIDIA Jetson Xavier NX</span>
        </div>
        <table>
          <thead>
            <tr>
              <th>Model</th>
              <th>Speed (FPS)</th>
              <th>mAP@0.5</th>
              <th>Suitability</th>
              <th>Engineering justification and notes</th>
            </tr>
          </thead>
          <tbody>
            {ARCH_BENCHMARKS.map(([model, fps, map, status, badgeCol, notes, isHl]) => (
              <tr key={model} className={isHl ? 'hl' : ''}>
                <td><b>{model}</b></td>
                <td className="num">{fps}</td>
                <td className="num">{map}</td>
                <td>
                  <span
                    className={`bd ${badgeCol}`}
                    style={{ padding: '2px 8px', borderRadius: 3, fontSize: '11.5px' }}
                  >
                    {status}
                  </span>
                </td>
                <td style={{ fontSize: '13px', color: 'var(--ink-2)' }}>{notes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Per-Class Precision & Recall Table */}
      <div className="card panel">
        <div className="t">
          <b>Per-class precision and recall</b>
          <span>Empirical validation set</span>
        </div>
        <table>
          <thead>
            <tr>
              <th>Class</th>
              <th>Precision</th>
              <th>Recall</th>
              <th style={{ width: '28%' }}>AP@0.5</th>
            </tr>
          </thead>
          <tbody>
            {CLASS_METRICS.map(([cls, prec, rec, ap]) => (
              <tr key={cls}>
                <td>{cls}</td>
                <td className="num">{prec}%</td>
                <td className="num">{rec}%</td>
                <td>
                  <div className="bar2">
                    <div className="tr">
                      <div style={{ width: `${ap}%`, background: 'var(--accent)' }} />
                    </div>
                    <span className="num">{ap}%</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Ambulance Mitigation Architecture Note */}
      <div className="card panel">
        <div className="t">
          <b>Ambulance detection challenges and dual mitigation architecture</b>
          <span>Transfer learning and acoustic sensor fusion</span>
        </div>
        <div className="b" style={{ fontSize: '13.5px', color: 'var(--ink-2)', lineHeight: 1.6 }}>
          <p style={{ marginBottom: 10 }}>
            Standard public benchmark datasets (such as MS COCO) do not provide a discrete "ambulance" class, requiring specialized transfer learning. Visually, ambulances share identical chassis silhouettes with commercial delivery vans and utility trucks, distinguished only by livery markings and rooftop emergency siren bars.
          </p>
          <p>
            UrbanPulse combines direct fine-tuning of YOLOv8 on curated emergency vehicle datasets with a secondary audio siren detection fusion module. Using Mel-frequency spectrograms from a roadway microphone array, the siren detector confirms approaching emergency units under adverse lighting, occlusion, or heavy precipitation.
          </p>
        </div>
      </div>
    </div>
  );
}
