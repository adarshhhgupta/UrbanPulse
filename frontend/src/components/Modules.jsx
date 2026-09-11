import React from 'react';

export default function Modules() {
  return (
    <section id="modules">
      <div className="section-header">
        <div className="section-tag">Core Technical Capabilities</div>
        <h2 className="section-title">
          <svg className="icon text-blue" viewBox="0 0 24 24">
            <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
            <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
            <line x1="6" y1="6" x2="6.01" y2="6" />
            <line x1="6" y1="18" x2="6.01" y2="18" />
          </svg>
          Feature Modules
        </h2>
        <p className="section-desc">
          Modular subsystems governing dynamic signal timing computation, corridor pre-emption, OCR violation pipelines, and acoustic siren fusion.
        </p>
      </div>

      <div className="modules-grid">
        {/* Module 1: Dynamic Green-Time */}
        <div className="module-card">
          <div className="module-card-header">
            <div className="module-icon-box">
              <svg className="icon" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
            <div className="module-title">Dynamic Green-Time Calculation</div>
          </div>
          <div className="module-desc">
            Computes adaptive phase duration based on real-time vehicle accumulation, preventing unnecessary idle red lights on congested approaches. Phase duration is bounded within safety bounds.
          </div>
          <div className="module-illustration-box">
            <div style={{ color: 'var(--accent-cyan)', marginBottom: '0.35rem' }}>Formula:</div>
            <div style={{ fontSize: '0.85rem', color: '#fff', fontWeight: 600 }}>green_time = base_time + k &times; vehicle_count</div>
            <div style={{ color: 'var(--text-muted)', marginTop: '0.4rem', fontSize: '0.75rem' }}>
              Where base_time = 15s, k = 1.2, clamped [15s &ndash; 90s].<br />
              <strong style={{ color: 'var(--signal-green)' }}>Worked Example:</strong> vehicle_count = 24<br />
              green_time = 15.0 + (1.2 &times; 24) = <strong>43.8s</strong>
            </div>
          </div>
        </div>

        {/* Module 2: Emergency Corridor Clearing */}
        <div className="module-card">
          <div className="module-card-header">
            <div className="module-icon-box" style={{ color: 'var(--accent-critical)' }}>
              <svg className="icon" viewBox="0 0 24 24">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
            </div>
            <div className="module-title">Emergency Corridor Clearing</div>
          </div>
          <div className="module-desc">
            Establishes high-priority green waves across consecutive arterial junctions by broadcasting MQTT pre-emption packets before the ambulance reaches downstream intersections.
          </div>
          <div className="module-illustration-box">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.25rem 0' }}>
              <span style={{ color: '#fff' }}>Junction N (Current)</span>
              <span className="text-critical font-mono">&rarr; MQTT Pre-empt &rarr;</span>
              <span style={{ color: '#fff' }}>Junction N+1 (Downstream)</span>
            </div>
            <div style={{ color: 'var(--text-dim)', fontSize: '0.7rem', marginTop: '0.35rem' }}>
              Estimated transit delay: 48s &bull; Pre-emption green scheduled at T+40s to flush residual queues prior to ambulance arrival.
            </div>
          </div>
        </div>

        {/* Module 3: Starvation Prevention */}
        <div className="module-card">
          <div className="module-card-header">
            <div className="module-icon-box" style={{ color: 'var(--signal-yellow)' }}>
              <svg className="icon" viewBox="0 0 24 24">
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
              </svg>
            </div>
            <div className="module-title">Starvation Prevention</div>
          </div>
          <div className="module-desc">
            Guarantees system equity by imposing a strict upper threshold on continuous red phase duration, ensuring low-density side streets are not perpetually denied passage.
          </div>
          <div className="module-illustration-box">
            <div style={{ color: 'var(--signal-yellow)', fontWeight: 600 }}>Active Watchdog Enforcement:</div>
            <div style={{ marginTop: '0.35rem', color: '#cbd5e1' }}>
              "Lane 3 has been red for 118s &mdash; max threshold 120s &mdash; forcing green transition in 2s regardless of main-road queue."
            </div>
          </div>
        </div>

        {/* Module 4: OCR Violation Detection */}
        <div className="module-card">
          <div className="module-card-header">
            <div className="module-icon-box">
              <svg className="icon" viewBox="0 0 24 24">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <line x1="8" y1="12" x2="16" y2="12" />
              </svg>
            </div>
            <div className="module-title">Number-Plate OCR Violation Detection</div>
          </div>
          <div className="module-desc">
            Automatic License Plate Recognition (ALPR) leveraging EasyOCR, activated exclusively when a vehicle bounding box crosses the virtual stop line during active red signal phases.
          </div>
          <div className="module-illustration-box">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="plate-badge">KA-05-MJ-4821</span>
              <span className="text-green font-mono">Conf: 94.8%</span>
            </div>
            <div style={{ color: 'var(--text-dim)', fontSize: '0.7rem', marginTop: '0.4rem' }}>
              Polygon virtual tripwire triggers crop buffer &bull; Spatial filtering eliminates zero-speed false triggers.
            </div>
          </div>
        </div>

        {/* Module 5: Siren Audio Detection Fusion */}
        <div className="module-card">
          <div className="module-card-header">
            <div className="module-icon-box" style={{ color: 'var(--accent-critical)' }}>
              <svg className="icon" viewBox="0 0 24 24">
                <path d="M11 5L6 9H2v6h4l5 4V5z" />
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
              </svg>
            </div>
            <div className="module-title">Siren Audio Detection Fusion</div>
          </div>
          <div className="module-desc">
            Microphone array audio processing using librosa generates Mel-spectrograms feeding a lightweight 1D-CNN, delivering secondary acoustic confirmation for emergency vehicles.
          </div>
          <div className="module-illustration-box">
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              <span>Mel-Frequency Spectrogram (960Hz &ndash; 1440Hz Yelp/Wail)</span>
              <span className="text-green">Siren Conf: 96.2%</span>
            </div>
            <div className="spectrogram-vis">
              <div className="spec-bar" style={{ height: '30%' }} />
              <div className="spec-bar" style={{ height: '45%' }} />
              <div className="spec-bar" style={{ height: '25%' }} />
              <div className="spec-bar" style={{ height: '85%' }} />
              <div className="spec-bar" style={{ height: '95%' }} />
              <div className="spec-bar" style={{ height: '90%' }} />
              <div className="spec-bar" style={{ height: '70%' }} />
              <div className="spec-bar" style={{ height: '40%' }} />
              <div className="spec-bar" style={{ height: '85%' }} />
              <div className="spec-bar" style={{ height: '100%' }} />
              <div className="spec-bar" style={{ height: '92%' }} />
              <div className="spec-bar" style={{ height: '50%' }} />
              <div className="spec-bar" style={{ height: '35%' }} />
              <div className="spec-bar" style={{ height: '60%' }} />
            </div>
          </div>
        </div>

        {/* Module 6: Edge Deployment Pipeline */}
        <div className="module-card">
          <div className="module-card-header">
            <div className="module-icon-box">
              <svg className="icon" viewBox="0 0 24 24">
                <rect x="4" y="4" width="16" height="16" rx="2" ry="2" />
                <rect x="9" y="9" width="6" height="6" />
                <line x1="9" y1="1" x2="9" y2="4" />
                <line x1="15" y1="1" x2="15" y2="4" />
                <line x1="9" y1="20" x2="9" y2="23" />
                <line x1="15" y1="20" x2="15" y2="23" />
              </svg>
            </div>
            <div className="module-title">Edge Deployment Pipeline</div>
          </div>
          <div className="module-desc">
            Low-latency edge deployment on NVIDIA Jetson Xavier NX / Raspberry Pi 4 coprocessors, driving industrial relay switches to control 220V signal infrastructure.
          </div>
          <div className="module-illustration-box">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem' }}>
              <span style={{ color: '#cbd5e1' }}>Camera &rarr; Jetson &rarr; Relay</span>
              <span className="font-mono text-green">Latency: &lt; 185ms</span>
            </div>
            <div style={{ color: 'var(--text-dim)', fontSize: '0.7rem', marginTop: '0.35rem' }}>
              End-to-end latency budget: Frame acquisition (33ms) + Inference (24ms) + Rule Engine (8ms) + Relay Actuation (120ms).
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
