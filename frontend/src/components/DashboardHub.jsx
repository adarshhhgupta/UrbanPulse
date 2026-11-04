import React from 'react';

const HUB = [
  [
    'lane-analytics',
    'Spatial perception',
    'Lane vehicle analytics and donut graphs',
    'Multi-class vehicle distribution (cars, autos, bikes, buses, trucks, ambulances, pedestrians) with SVG donut charts and PCU load allocation across all 4 lanes.',
    [['Total objects', '75'], ['Motorized', '57'], ['Pedestrians', '18'], ['Emergency', '1 Amb']],
    '4 approaches analyzed',
    'blue',
    'Open lane analytics'
  ],
  [
    'detection-models',
    'Computer vision',
    'Perception and detection models',
    'YOLOv8s architecture specs, multi-class detection telemetry, inference latency benchmarks (42 FPS), and the per-class precision and recall table.',
    [['Base detector', 'YOLOv8s'], ['Mean AP@0.5', '91.3%'], ['Latency', '23.8 ms'], ['Classes', '7 types']],
    'Empirical validation set',
    'green',
    'Inspect detection models'
  ],
  [
    'prediction-engine',
    'Time-series modeling',
    'LSTM predictive signal engine',
    'Seq2Seq multi-horizon congestion forecasting (t+2m to t+10m), four calibrated lane scenarios, and the dynamic arbitration decision matrix (rules P1 to P4).',
    [['Forecasting', '10-min horizon'], ['Architecture', 'Seq2Seq LSTM'], ['Peak drawdown', '-24.0%'], ['Arbitration', 'P1-P4 engaged']],
    'Multi-horizon model',
    'amber',
    'Launch prediction engine'
  ],
  [
    'modules',
    'Actuation and control',
    'Intelligent feature modules',
    'Core control algorithms: emergency vehicle preemption, pedestrian safety watchdog, dynamic green phase calculator, adaptive split optimizer, and incident detector.',
    [['Control loop', '0.1 s rate'], ['Active modules', '5 algorithmic'], ['Preemption', 'Zero delay'], ['Reliability', 'Watchdog safe']],
    '5 modules operational',
    'purple',
    'Explore feature modules'
  ],
  [
    'violations',
    'Enforcement telemetry',
    'Automated enforcement (OCR)',
    'Immutable register of red-light stop-line infringements, read by EasyOCR with confidence telemetry and automatic e-challan generation.',
    [['OCR pipeline', 'EasyOCR'], ['Mean conf.', '94.8%'], ['Logged breaches', '6 events'], ['Infringement type', 'Stop-line']],
    'Enforcement active',
    'red',
    'View violations log'
  ],
  [
    'evaluation',
    'Simulation benchmarks',
    'System evaluation and benchmarks',
    'Delay reduction, emissions drop, fuel savings and throughput gains measured in SUMO microscopic simulation against 60 s fixed-time controllers.',
    [['Wait-time cut', '27.4%'], ['Fuel saved', '14.8%'], ['CO2 reduction', '16.2%'], ['Uptime', '99.6%']],
    'SUMO validated',
    'green',
    'View empirical evaluation'
  ]
];

export default function DashboardHub({ onNavigate }) {
  const handleRowClick = (pageId) => {
    if (onNavigate) {
      onNavigate(pageId);
    } else {
      window.location.hash = pageId;
    }
  };

  return (
    <section className="hubwrap" id="dashboard-hub">
      <div className="sh">
        <div className="kick">Workstation sub-systems and analytics hub</div>
        <h2>Sub-systems and analytics</h2>
        <p>Open any component for its dedicated telemetry, technical architecture and full-size charts.</p>
      </div>

      <div className="hub">
        {HUB.map(([id, category, title, description, metrics, badge, badgeColor, actionText]) => (
          <button
            key={id}
            className="row"
            onClick={() => handleRowClick(id)}
            type="button"
          >
            <div>
              <div className="tg">{category}</div>
              <h3>{title}</h3>
              <p>{description}</p>
            </div>

            <span className={`bd ${badgeColor}`}>{badge}</span>

            <div className="mx">
              {metrics.map(([label, val]) => (
                <div key={label}>
                  <span>{label}</span>
                  <b className="num">{val}</b>
                </div>
              ))}
              <span className="go">{actionText} →</span>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
