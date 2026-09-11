import React from 'react';

export default function Dataset() {
  const datasets = [
    {
      name: 'UA-DETRAC Benchmark',
      purpose: 'Multi-target tracking and occlusion benchmark under dense real-world traffic conditions',
      samples: '140,000 frames (8,250 vehicles)',
      split: '70% / 15% / 15%'
    },
    {
      name: 'Roboflow Custom Ambulance Set',
      purpose: 'Fine-tuning YOLOv8 for emergency vehicle chassis, roof beacon bars, and high-visibility liveries',
      samples: '4,850 augmented images',
      split: '70% / 20% / 10%'
    },
    {
      name: 'MS COCO 2017',
      purpose: 'General vehicle backbone pre-training (cars, buses, trucks, motorcycles)',
      samples: '118,287 annotated frames',
      split: '80% / 10% / 10%'
    },
    {
      name: 'IDD (Indian Driving Dataset)',
      purpose: 'Domain adaptation for unstructured traffic: auto-rickshaws, dense two-wheelers, side-street surges',
      samples: '32,410 labeled images',
      split: '70% / 15% / 15%'
    },
    {
      name: 'Own Recorded Junction Footage',
      purpose: 'Real-world 4-camera validation set collected at 1080p under varying daylight & weather regimes',
      samples: '6,200 verified frames',
      split: '0% / 50% / 50% (Eval only)'
    },
    {
      name: 'Caltrans PeMS Traffic Density Data',
      purpose: 'LSTM temporal sequence training for 5-min and 10-min multi-horizon queue accumulation forecasting',
      samples: '52,000 hourly time-series points',
      split: '80% / 10% / 10%'
    }
  ];

  return (
    <section id="dataset">
      <div className="section-header">
        <div className="section-tag">Data Engineering & Provenance</div>
        <h2 className="section-title">
          <svg className="icon text-blue" viewBox="0 0 24 24">
            <ellipse cx="12" cy="5" rx="9" ry="3" />
            <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
            <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
          </svg>
          Dataset Specifications & Splits
        </h2>
        <p className="section-desc">
          Summary of pre-training, domain-adaptation, fine-tuning, and time-series traffic density corpora employed across system modules.
        </p>
      </div>

      <div className="panel">
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Dataset</th>
                <th>Engineering Purpose</th>
                <th>Sample Count / Size</th>
                <th>Train / Val / Test Split</th>
              </tr>
            </thead>
            <tbody>
              {datasets.map((d) => (
                <tr key={d.name}>
                  <td><strong>{d.name}</strong></td>
                  <td>{d.purpose}</td>
                  <td className="font-mono text-muted">{d.samples}</td>
                  <td><span className="split-pill">{d.split}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
