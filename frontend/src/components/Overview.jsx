import React from 'react';

const SPEC = [
  ['live-junction', 'Lanes monitored', '4', 'Quad-camera RTSP stream'],
  ['detection-models', 'Detection model', 'YOLOv8s', 'mAP@0.5 91.3%, 42 FPS'],
  ['prediction-engine', 'Prediction model', 'LSTM', 'Seq2Seq, 10-min horizon'],
  ['evaluation', 'Avg. wait reduction', '27.4%', 'vs fixed 60 s cycle (SUMO)'],
  ['lane-analytics', 'Active detected fleet', '75', '57 vehicles, 18 VRUs'],
  ['modules', 'System uptime', '99.6%', 'Edge watchdog verified']
];

export default function Overview({ onNavigate }) {
  const handleRowClick = (pageId) => {
    if (onNavigate) {
      onNavigate(pageId);
    } else {
      window.location.hash = pageId;
    }
  };

  return (
    <section className="hero" id="overview">
      <div>
        <h1>UrbanPulse</h1>
        <p className="lede">
          AI-powered 4-lane junction control with emergency preemption and predictive signal timing.
        </p>
        <p>
          UrbanPulse is an end-to-end intelligent traffic control platform built to ease urban intersection gridlock and prioritise emergency transit. Real-time YOLOv8 object detection feeds multi-horizon Long Short-Term Memory (LSTM) forecasting, so phase splits are calculated dynamically instead of following a legacy fixed-time controller. A prioritised rule-based decision matrix guarantees deterministic pre-emption for emergency services while preventing starvation of opposing queues.
        </p>
      </div>

      <div className="spec">
        <div className="spec-h">
          Academic engineering deliverable and telemetry dashboard
        </div>
        {SPEC.map(([pageId, label, value, note]) => (
          <button
            key={pageId}
            className="spec-r"
            onClick={() => handleRowClick(pageId)}
            type="button"
          >
            <span className="l">{label}</span>
            <span className={`v ${value.length > 5 ? 'sm' : ''} num`}>{value}</span>
            <span className="n">{note}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
