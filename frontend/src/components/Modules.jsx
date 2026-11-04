import React from 'react';

const MODULES_LIST = [
  ['Emergency vehicle preemption', 'Locks opposing lanes red, clears a corridor, pre-empts Junction 7 over MQTT', 'Operational'],
  ['Pedestrian safety watchdog', 'Extends clearance when pedestrians are detected in the crossing', 'Operational'],
  ['Dynamic green phase calculator', 'T_green = base + k x PCU per approach', 'Operational'],
  ['Adaptive split optimizer', 'Re-orders phases from the 10-min LSTM forecast', 'Operational'],
  ['Incident detector', 'Flags stalled vehicles and blocked lanes', 'Operational']
];

export default function Modules() {
  return (
    <div id="modules">
      {/* Metric Strip */}
      <div className="kg">
        <div>
          <span>Control loop</span>
          <b className="num">0.1 s rate</b>
        </div>
        <div>
          <span>Active modules</span>
          <b className="num">5 algorithmic</b>
        </div>
        <div>
          <span>Preemption</span>
          <b className="num">Zero delay</b>
        </div>
        <div>
          <span>Reliability</span>
          <b className="num">Watchdog safe</b>
        </div>
      </div>

      {/* Active Algorithmic Modules Table */}
      <div className="card panel">
        <div className="t">
          <b>Active algorithmic modules</b>
          <span>Control loop 0.1 s</span>
        </div>
        <table>
          <thead>
            <tr>
              <th style={{ width: '28%' }}>Module</th>
              <th style={{ width: '56%' }}>Role</th>
              <th style={{ width: '16%' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {MODULES_LIST.map(([name, role, status]) => (
              <tr key={name}>
                <td><b>{name}</b></td>
                <td>{role}</td>
                <td>
                  <span
                    className="bd purple"
                    style={{ padding: '2px 8px', borderRadius: 3, fontSize: '11.5px' }}
                  >
                    {status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Feature Architecture Cards */}
      <div className="modules-grid">
        {/* Module 1: Dynamic Green-Time */}
        <div className="module-card">
          <div className="module-card-header">
            <div className="module-icon-box">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
            <div className="module-title">Dynamic green-time calculation</div>
          </div>
          <div className="module-desc">
            Computes adaptive phase duration based on real-time vehicle accumulation, preventing unnecessary idle red lights on congested approaches. Phase duration is bounded within safety bounds.
          </div>
          <div className="module-illustration-box">
            <div style={{ color: 'var(--accent)', marginBottom: 4, fontWeight: 500 }}>Formula:</div>
            <div style={{ fontWeight: 600, color: 'var(--ink)' }}>
              green_time = base_time + k × vehicle_count
            </div>
            <div style={{ color: 'var(--ink-2)', marginTop: 6, fontSize: '12px' }}>
              Where base_time = 15 s, k = 1.2, clamped [15 s – 90 s].<br />
              <b>Worked example:</b> vehicle_count = 24 → green_time = 15.0 + (1.2 × 24) = <b>43.8 s</b>
            </div>
          </div>
        </div>

        {/* Module 2: Emergency Corridor Clearing */}
        <div className="module-card">
          <div className="module-card-header">
            <div className="module-icon-box" style={{ color: 'var(--red)' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
            </div>
            <div className="module-title">Emergency corridor clearing</div>
          </div>
          <div className="module-desc">
            Establishes high-priority green waves across consecutive arterial junctions by broadcasting MQTT pre-emption packets before the ambulance reaches downstream intersections.
          </div>
          <div className="module-illustration-box">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>Junction N (Current)</span>
              <span className="num" style={{ color: 'var(--red)', fontWeight: 600 }}>→ MQTT pre-empt →</span>
              <span>Junction N+1 (Downstream)</span>
            </div>
            <div style={{ color: 'var(--ink-3)', fontSize: '12px', marginTop: 6 }}>
              Estimated transit delay: 48 s · Pre-emption green scheduled at T+40 s to flush residual queues prior to ambulance arrival.
            </div>
          </div>
        </div>

        {/* Module 3: Starvation Prevention */}
        <div className="module-card">
          <div className="module-card-header">
            <div className="module-icon-box" style={{ color: 'var(--amber)' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
              </svg>
            </div>
            <div className="module-title">Starvation prevention watchdog</div>
          </div>
          <div className="module-desc">
            Guarantees system equity by imposing a strict upper threshold on continuous red phase duration, ensuring low-density side streets are not perpetually denied passage.
          </div>
          <div className="module-illustration-box">
            <div style={{ color: 'var(--amber)', fontWeight: 600, marginBottom: 4 }}>Active watchdog enforcement:</div>
            <div style={{ color: 'var(--ink-2)', fontSize: '12px' }}>
              "Lane 3 red duration exceeds 118 s (maximum threshold 120 s). Forcing green transition in 2 s regardless of main-road queue."
            </div>
          </div>
        </div>

        {/* Module 4: OCR Violation Detection */}
        <div className="module-card">
          <div className="module-card-header">
            <div className="module-icon-box">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <line x1="8" y1="12" x2="16" y2="12" />
              </svg>
            </div>
            <div className="module-title">Number-plate OCR violation detection</div>
          </div>
          <div className="module-desc">
            Automatic License Plate Recognition (ALPR) leveraging EasyOCR, activated exclusively when a vehicle bounding box crosses the virtual stop line during active red signal phases.
          </div>
          <div className="module-illustration-box">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="plate-badge">KA-05-MJ-4821</span>
              <span className="num" style={{ color: 'var(--green)', fontWeight: 600 }}>Confidence: 94.8%</span>
            </div>
            <div style={{ color: 'var(--ink-3)', fontSize: '12px', marginTop: 6 }}>
              Polygon virtual tripwire triggers crop buffer · Spatial filtering eliminates zero-speed false triggers.
            </div>
          </div>
        </div>

        {/* Module 5: Siren Audio Detection Fusion */}
        <div className="module-card">
          <div className="module-card-header">
            <div className="module-icon-box" style={{ color: 'var(--red)' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 5L6 9H2v6h4l5 4V5z" />
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
              </svg>
            </div>
            <div className="module-title">Siren audio detection fusion</div>
          </div>
          <div className="module-desc">
            Roadside microphone array audio processing using librosa generates Mel-spectrograms feeding a lightweight 1D-CNN, delivering secondary acoustic confirmation for emergency vehicles.
          </div>
          <div className="module-illustration-box">
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--ink-2)' }}>
              <span>Mel-frequency spectrogram (960 Hz – 1440 Hz)</span>
              <span className="num" style={{ color: 'var(--green)', fontWeight: 600 }}>Siren conf: 96.2%</span>
            </div>
            <div className="spectrogram-vis">
              {[30, 45, 25, 85, 95, 90, 70, 40, 85, 100, 92, 50, 35, 60].map((h, idx) => (
                <div key={idx} className="spec-bar" style={{ height: `${h}%` }} />
              ))}
            </div>
          </div>
        </div>

        {/* Module 6: Edge Deployment Pipeline */}
        <div className="module-card">
          <div className="module-card-header">
            <div className="module-icon-box">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="4" y="4" width="16" height="16" rx="2" ry="2" />
                <rect x="9" y="9" width="6" height="6" />
                <line x1="9" y1="1" x2="9" y2="4" />
                <line x1="15" y1="1" x2="15" y2="4" />
                <line x1="9" y1="20" x2="9" y2="23" />
                <line x1="15" y1="20" x2="15" y2="23" />
              </svg>
            </div>
            <div className="module-title">Edge deployment pipeline</div>
          </div>
          <div className="module-desc">
            Low-latency edge deployment on NVIDIA Jetson Xavier NX coprocessors, driving industrial solid-state relay switches to control 220V signal lamps.
          </div>
          <div className="module-illustration-box">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12.5px' }}>
              <span>Camera → Jetson → Relay</span>
              <span className="num" style={{ color: 'var(--green)', fontWeight: 600 }}>Latency &lt; 185 ms</span>
            </div>
            <div style={{ color: 'var(--ink-3)', fontSize: '12px', marginTop: 6 }}>
              End-to-end latency budget: Frame acquisition (33 ms) + Inference (24 ms) + Rule Engine (8 ms) + Relay Actuation (120 ms).
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
