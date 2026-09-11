import React from 'react';

export default function Deployment() {
  return (
    <section id="deployment">
      <div className="section-header">
        <div className="section-tag">Edge Hardware & Distributed Topology</div>
        <h2 className="section-title">
          <svg className="icon text-blue" viewBox="0 0 24 24">
            <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
            <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
            <line x1="12" y1="10" x2="12" y2="14" />
          </svg>
          Deployment Pipeline & Hardware Topology
        </h2>
        <p className="section-desc">
          Physical on-premise junction deployment schematics connecting pole-mounted CCTV cameras to edge compute units and central traffic telemetry servers.
        </p>
      </div>

      <div className="deploy-flow">
        <div className="deploy-box">
          <span className="deploy-box-label">Perception Input</span>
          <span className="deploy-box-title">IP Cameras (x4)</span>
          <span className="deploy-box-desc">RTSP H.264 streams over Gigabit PoE ethernet.</span>
        </div>
        <div className="deploy-arrow">
          <svg className="icon icon-sm" viewBox="0 0 24 24"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
        </div>
        <div className="deploy-box">
          <span className="deploy-box-label">Edge Coprocessor</span>
          <span className="deploy-box-title">Jetson Xavier NX</span>
          <span className="deploy-box-desc">TensorRT FP16 inference engine running YOLOv8s.</span>
        </div>
        <div className="deploy-arrow">
          <svg className="icon icon-sm" viewBox="0 0 24 24"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
        </div>
        <div className="deploy-box">
          <span className="deploy-box-label">Control Logic</span>
          <span className="deploy-box-title">Decision Engine</span>
          <span className="deploy-box-desc">Local deterministic priority rules & fail-safe timers.</span>
        </div>
        <div className="deploy-arrow">
          <svg className="icon icon-sm" viewBox="0 0 24 24"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
        </div>
        <div className="deploy-box">
          <span className="deploy-box-label">Physical Actuation</span>
          <span className="deploy-box-title">Relay / PLC Board</span>
          <span className="deploy-box-desc">Solid-state relays actuating 220V signal lamps.</span>
        </div>
        <div className="deploy-arrow">
          <svg className="icon icon-sm" viewBox="0 0 24 24"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
        </div>
        <div className="deploy-box">
          <span className="deploy-box-label">Central Telemetry</span>
          <span className="deploy-box-title">UrbanPulse Dashboard</span>
          <span className="deploy-box-desc">MQTT / WebSockets streaming to this web dashboard.</span>
        </div>
      </div>

      <div className="deploy-notes-grid">
        <div className="dual-model-card">
          <h4 style={{ color: '#f1f5f9', marginBottom: '0.5rem', fontSize: '0.95rem' }}>
            System Scalability & City-Wide Grid Expansion
          </h4>
          <p>
            The modular architecture is inherently designed for horizontal scalability across distributed urban road grids. Because each junction executes inference and priority arbitration locally on dedicated edge hardware, bandwidth requirements to central traffic headquarters are strictly limited to lightweight JSON telemetry payloads (less than 15 KB/s per junction).
          </p>
          <p>
            Inter-junction coordination is achieved via lightweight publish-subscribe MQTT brokers over municipal fiber or 5G private APNs. When an ambulance priority event occurs at node <em>J</em>, an upstream pre-emption message propagates along the planned navigation corridor, allowing downstream nodes to clear standing queues prior to vehicle arrival without requiring centralized monolithic computing clusters.
          </p>
        </div>

        <div className="dual-model-card">
          <h4 style={{ color: '#f1f5f9', marginBottom: '0.5rem', fontSize: '0.95rem' }}>
            Current Engineering Limitations & Future Work
          </h4>
          <p>
            While the system achieves high reliability under standard daylight conditions, several physical and environmental constraints exist. In torrential monsoon rain, lens splash distortion and severe lens glare degrade computer vision mAP by up to 14.8%. Heavy bumper-to-bumper occlusions where smaller two-wheelers are masked behind large commercial trucks occasionally induce queue estimation errors.
          </p>
          <p>
            Additionally, thermal dissipation and initial capital expenditure for ruggedized IP67 edge AI compute enclosures present budgetary constraints for broad municipal rollouts. Future iterations plan to integrate 77 GHz millimeter-wave radar fusion to preserve high detection accuracy during zero-visibility fog and night conditions.
          </p>
        </div>
      </div>
    </section>
  );
}
