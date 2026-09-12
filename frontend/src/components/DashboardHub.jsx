import React from 'react';

export default function DashboardHub({ onNavigate }) {
  const modules = [
    {
      id: 'lane-analytics',
      tag: 'Spatial Perception',
      title: 'Lane Vehicle Analytics & Donut Graphs',
      desc: 'Multi-class vehicle distribution (Cars, Autos, Bikes, Buses, Trucks, Ambulances, Pedestrians) with animated SVG donut charts and PCU load allocation across all 4 lanes.',
      metrics: [
        { label: 'Total Objects', value: '75' },
        { label: 'Motorized', value: '57' },
        { label: 'Pedestrians', value: '18' },
        { label: 'Emergency', value: '1 Amb' }
      ],
      badge: '4 Approaches Analyzed',
      badgeClass: 'hub-badge-blue',
      btnText: 'Open Lane Analytics'
    },
    {
      id: 'detection-models',
      tag: 'Computer Vision',
      title: 'Perception & Detection Models',
      desc: 'YOLOv8s architecture specs, multi-class object detection telemetry, inference latency benchmarks (42 FPS), and empirical per-class precision and recall performance table.',
      metrics: [
        { label: 'Base Detector', value: 'YOLOv8s' },
        { label: 'Mean AP@0.5', value: '91.3%' },
        { label: 'Latency', value: '23.8 ms' },
        { label: 'Classes', value: '7 Types' }
      ],
      badge: 'Empirical Validation Set',
      badgeClass: 'hub-badge-green',
      btnText: 'Inspect Detection Models'
    },
    {
      id: 'prediction-engine',
      tag: 'Time-Series Modeling',
      title: 'LSTM Predictive Signal Engine',
      desc: 'Seq2Seq multi-horizon congestion density forecasting (t+2m to t+10m), 4 distinct calibrated lane scenarios, and dynamic arbitration decision matrix (Rules P1–P4).',
      metrics: [
        { label: 'Forecasting', value: '10-Min Horizon' },
        { label: 'Architecture', value: 'Seq2Seq LSTM' },
        { label: 'Peak Drawdown', value: '-24.0%' },
        { label: 'Arbitration', value: 'P1-P4 Engaged' }
      ],
      badge: 'Multi-Horizon Model',
      badgeClass: 'hub-badge-amber',
      btnText: 'Launch Prediction Engine'
    },
    {
      id: 'modules',
      tag: 'Actuation & Control',
      title: 'Intelligent Feature Modules',
      desc: 'Core control algorithms: Emergency vehicle preemption, pedestrian safety watchdog, dynamic green phase calculator, adaptive split optimizer, and incident detector.',
      metrics: [
        { label: 'Control Loop', value: '0.1s Rate' },
        { label: 'Active Modules', value: '5 Algorithmic' },
        { label: 'Preemption', value: 'Zero Delay' },
        { label: 'Reliability', value: 'Watchdog Safe' }
      ],
      badge: '5 Modules Operational',
      badgeClass: 'hub-badge-purple',
      btnText: 'Explore Feature Modules'
    },
    {
      id: 'violations',
      tag: 'Enforcement Telemetry',
      title: 'Automated Enforcement (OCR)',
      desc: 'Immutable digital register for red-light stop-line infringements, powered by EasyOCR license plate recognition with confidence telemetry and automatic e-challan generation.',
      metrics: [
        { label: 'OCR Pipeline', value: 'EasyOCR' },
        { label: 'Mean Conf.', value: '94.8%' },
        { label: 'Logged Breaches', value: '6 Events' },
        { label: 'Infringement Type', value: 'Stop-Line' }
      ],
      badge: 'Enforcement Active',
      badgeClass: 'hub-badge-red',
      btnText: 'View Violations Log'
    },
    {
      id: 'evaluation',
      tag: 'Simulation Benchmarks',
      title: 'System Evaluation & Benchmarks',
      desc: 'Quantitative macroscopic delay reduction, carbon emissions drop, fuel savings, and throughput gains evaluated in SUMO microscopic simulation against 60s fixed-time controllers.',
      metrics: [
        { label: 'Wait-Time Cut', value: '27.4%' },
        { label: 'Fuel Saved', value: '14.8%' },
        { label: 'CO2 Reduction', value: '16.2%' },
        { label: 'Uptime', value: '99.6%' }
      ],
      badge: 'SUMO Validated',
      badgeClass: 'hub-badge-green',
      btnText: 'View Empirical Evaluation'
    }
  ];

  return (
    <section id="dashboard-hub" className="dashboard-hub-section">
      <div className="section-header">
        <div className="section-tag">Workstation Sub-Systems & Analytics Hub</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 className="section-title">
              <svg className="icon text-blue" viewBox="0 0 24 24">
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
              </svg>
              Specialized System Pages & Deep-Dive Analytics
            </h2>
            <p className="section-desc">
              Select any workstation component below to inspect dedicated telemetry, technical architectures, and high-resolution data visualizations in full view.
            </p>
          </div>
          <span className="font-mono text-dim" style={{ fontSize: '0.78rem' }}>
            6 Sub-Systems Online • Quad-Channel Synchronized
          </span>
        </div>
      </div>

      <div className="dashboard-hub-grid">
        {modules.map((mod) => (
          <div
            key={mod.id}
            className="hub-card"
            onClick={() => onNavigate(mod.id)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter') onNavigate(mod.id); }}
          >
            <div>
              <div className="hub-card-header">
                <span className="hub-card-tag font-mono">{mod.tag}</span>
                <span className={`hub-card-badge ${mod.badgeClass} font-mono`}>{mod.badge}</span>
              </div>

              <h3 className="hub-card-title">{mod.title}</h3>
              <p className="hub-card-desc">{mod.desc}</p>
            </div>

            <div className="hub-card-bottom">
              <div className="hub-metrics-grid">
                {mod.metrics.map((m, idx) => (
                  <div key={idx} className="hub-metric-item">
                    <span className="hub-metric-label">{m.label}</span>
                    <span className="hub-metric-val font-mono">{m.value}</span>
                  </div>
                ))}
              </div>

              <div className="hub-action-row">
                <span className="hub-action-link">
                  {mod.btnText}
                  <svg className="icon icon-sm" viewBox="0 0 24 24">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
