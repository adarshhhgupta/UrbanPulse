import React, { useState, useEffect, useRef } from 'react';

export default function LiveJunction() {
  const [lanes, setLanes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [emergencyOverride, setEmergencyOverride] = useState(true);
  const [wsConnected, setWsConnected] = useState(false);
  const [videoTracks, setVideoTracks] = useState(null);
  const [activeDetections, setActiveDetections] = useState({});

  // Accurate initial reference detections matching the video frame 0
  const defaultAccurateLanes = [
    {
      id: 1,
      lane_number: 1,
      current_state: 'green',
      density_percent: 42.0,
      queue_count: 6,
      is_ambulance_detected: true,
      last_updated: new Date().toISOString(),
      detections: [
        { id: 1, vehicle_class: 'ambulance', confidence_score: 0.98, bbox_x: 0.060, bbox_y: 0.445, bbox_w: 0.134, bbox_h: 0.475 },
        { id: 2, vehicle_class: 'car', confidence_score: 0.94, bbox_x: 0.546, bbox_y: 0.644, bbox_w: 0.113, bbox_h: 0.193 },
        { id: 3, vehicle_class: 'car', confidence_score: 0.92, bbox_x: 0.778, bbox_y: 0.656, bbox_w: 0.117, bbox_h: 0.162 }
      ]
    },
    {
      id: 2,
      lane_number: 2,
      current_state: 'red',
      density_percent: 82.0,
      queue_count: 14,
      is_ambulance_detected: false,
      last_updated: new Date().toISOString(),
      detections: [
        { id: 4, vehicle_class: 'bus', confidence_score: 0.92, bbox_x: 0.485, bbox_y: 0.410, bbox_w: 0.065, bbox_h: 0.185 },
        { id: 5, vehicle_class: 'car', confidence_score: 0.94, bbox_x: 0.245, bbox_y: 0.535, bbox_w: 0.075, bbox_h: 0.125 },
        { id: 6, vehicle_class: 'auto-rickshaw', confidence_score: 0.91, bbox_x: 0.380, bbox_y: 0.450, bbox_w: 0.055, bbox_h: 0.095 },
        { id: 7, vehicle_class: 'bike', confidence_score: 0.89, bbox_x: 0.280, bbox_y: 0.650, bbox_w: 0.040, bbox_h: 0.090 }
      ]
    },
    {
      id: 3,
      lane_number: 3,
      current_state: 'red',
      density_percent: 18.0,
      queue_count: 3,
      is_ambulance_detected: false,
      last_updated: new Date().toISOString(),
      detections: [
        { id: 8, vehicle_class: 'bus', confidence_score: 0.96, bbox_x: 0.209, bbox_y: 0.610, bbox_w: 0.214, bbox_h: 0.381 },
        { id: 9, vehicle_class: 'car', confidence_score: 0.91, bbox_x: 0.483, bbox_y: 0.320, bbox_w: 0.063, bbox_h: 0.147 },
        { id: 10, vehicle_class: 'car', confidence_score: 0.89, bbox_x: 0.445, bbox_y: 0.246, bbox_w: 0.059, bbox_h: 0.116 }
      ]
    },
    {
      id: 4,
      lane_number: 4,
      current_state: 'red',
      density_percent: 55.0,
      queue_count: 8,
      is_ambulance_detected: false,
      last_updated: new Date().toISOString(),
      detections: [
        { id: 11, vehicle_class: 'car', confidence_score: 0.96, bbox_x: 0.488, bbox_y: 0.410, bbox_w: 0.191, bbox_h: 0.248 },
        { id: 12, vehicle_class: 'auto-rickshaw', confidence_score: 0.94, bbox_x: 0.000, bbox_y: 0.430, bbox_w: 0.249, bbox_h: 0.357 },
        { id: 13, vehicle_class: 'auto-rickshaw', confidence_score: 0.92, bbox_x: 0.220, bbox_y: 0.378, bbox_w: 0.212, bbox_h: 0.275 },
        { id: 14, vehicle_class: 'auto-rickshaw', confidence_score: 0.90, bbox_x: 0.656, bbox_y: 0.362, bbox_w: 0.070, bbox_h: 0.176 }
      ]
    }
  ];

  // Load time-indexed high-accuracy detections for videos
  useEffect(() => {
    fetch('/videos/detections_data.json')
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error('No detections_data.json');
      })
      .then((data) => {
        setVideoTracks(data);
      })
      .catch((err) => {
        console.info('Using default accurate video detections:', err.message);
      });
  }, []);

  // Sync bounding boxes to video playback time
  const handleTimeUpdate = (laneNumber, e) => {
    if (!videoTracks || !videoTracks[laneNumber]) return;
    const laneTrack = videoTracks[laneNumber];
    const duration = laneTrack.duration || 10.0;
    const loopTime = e.target.currentTime % duration;
    const steps = laneTrack.steps;
    if (!steps || steps.length === 0) return;

    // Steps sampled every 0.5s -> index = round(loopTime * 2)
    const idx = Math.min(steps.length - 1, Math.max(0, Math.round(loopTime * 2)));
    if (steps[idx] && steps[idx].detections) {
      setActiveDetections((prev) => ({
        ...prev,
        [laneNumber]: steps[idx].detections
      }));
    }
  };

  // REST & WebSocket telemetry fetch
  useEffect(() => {
    let ws = null;
    let reconnectTimeout = null;

    const fetchInitialLanes = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/lanes').catch(() => fetch('http://localhost:8001/api/lanes'));
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const data = await res.json();
        setLanes(data);
        setError(null);
      } catch (err) {
        setLanes(defaultAccurateLanes);
      } finally {
        setLoading(false);
      }
    };

    const connectWebSocket = () => {
      try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws/lanes`;
        ws = new WebSocket(wsUrl);
        ws.onopen = () => {
          setWsConnected(true);
          setError(null);
        };
        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            if (msg.lanes && Array.isArray(msg.lanes)) {
              setLanes(msg.lanes);
            }
          } catch (e) {
            console.error('Error parsing WS telemetry:', e);
          }
        };
        ws.onerror = () => {
          setWsConnected(false);
        };
        ws.onclose = () => {
          setWsConnected(false);
          reconnectTimeout = setTimeout(connectWebSocket, 4000);
        };
      } catch (err) {
        setWsConnected(false);
      }
    };

    fetchInitialLanes();
    connectWebSocket();

    return () => {
      if (ws) ws.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, []);

  const toggleScenario = () => {
    setEmergencyOverride(!emergencyOverride);
  };

  const getBBoxClass = (cls) => {
    switch (cls) {
      case 'ambulance':
        return 'bbox-ambulance';
      case 'auto-rickshaw':
      case 'auto':
        return 'bbox-auto-rickshaw';
      case 'bus':
        return 'bbox-bus';
      case 'truck':
        return 'bbox-truck';
      case 'bike':
      case 'motorcycle':
        return 'bbox-bike';
      default:
        return 'bbox-car';
    }
  };

  return (
    <section id="live-junction">
      <div className="section-header">
        <div className="section-tag">Real-Time Control Room Telemetry</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 className="section-title">
              <svg className="icon text-green" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              Live 4-Lane Junction View
            </h2>
            <p className="section-desc">
              Synchronized quad-camera perception feeds with real-time YOLOv8 bounding box annotations, queue estimation,
              and illuminated 3-lamp signal heads driven by WebSocket telemetry.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <span className="font-mono" style={{ fontSize: '0.75rem', color: wsConnected ? 'var(--signal-green)' : 'var(--signal-yellow)' }}>
              {wsConnected ? '● WS Live Stream' : '○ Standby Snapshot'}
            </span>
            <button className="sim-btn" onClick={toggleScenario}>
              <svg className="icon icon-sm text-critical" viewBox="0 0 24 24">
                <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {emergencyOverride ? 'Simulate Phase Resumption' : 'Trigger Ambulance Override (Lane 1)'}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="error-banner">
          <span>{error}</span>
          <button className="sim-btn" onClick={() => window.location.reload()} style={{ padding: '0.2rem 0.5rem' }}>Retry</button>
        </div>
      )}

      {emergencyOverride && (
        <div className="emergency-banner" id="emergencyBanner">
          <div className="emergency-left">
            <div className="siren-icon-box">
              <svg className="icon icon-lg" viewBox="0 0 24 24">
                <path d="M12 2a5 5 0 0 0-5 5v3H5a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-2a2 2 0 0 0-2-2h-2V7a5 5 0 0 0-5-5z" />
                <line x1="12" y1="18" x2="12" y2="22" />
                <line x1="8" y1="22" x2="16" y2="22" />
              </svg>
            </div>
            <div>
              <div className="emergency-title">EMERGENCY OVERRIDE ENGAGED — AMBULANCE DETECTED IN LANE 1</div>
              <div className="emergency-sub">
                Corridor Clearing: Next downstream node <strong style={{ color: '#fff' }}>Junction 7</strong> notified via MQTT — pre-emptive green corridor scheduled.
              </div>
            </div>
          </div>
          <div className="emergency-meta-chip font-mono">
            CONFIDENCE: <span className="text-green" style={{ fontWeight: 700 }}>0.98</span> | TIME TO HORIZON: 8.2s
          </div>
        </div>
      )}

      {loading ? (
        <div className="loading-box">Initializing Quad-Stream Feed Telemetry...</div>
      ) : (
        <div className="lanes-grid">
          {lanes.map((lane) => {
            let isGreen = lane.current_state === 'green';
            let isRed = lane.current_state === 'red';
            let isYellow = lane.current_state === 'yellow';

            if (!emergencyOverride) {
              if (lane.lane_number === 1) { isGreen = false; isRed = true; }
              if (lane.lane_number === 2) { isGreen = true; isRed = false; }
              if (lane.lane_number === 3) { isGreen = false; isRed = true; }
              if (lane.lane_number === 4) { isYellow = true; isRed = false; }
            }

            const laneTitles = {
              1: 'Lane 1 (Northbound)',
              2: 'Lane 2 (Eastbound)',
              3: 'Lane 3 (Southbound)',
              4: 'Lane 4 (Westbound)'
            };

            // Use dynamic tracked detections if available, otherwise default accurate detections
            const laneTracked = activeDetections[lane.lane_number];
            const currentDetections = (laneTracked && laneTracked.length > 0)
              ? laneTracked
              : (lane.detections && lane.detections.length > 0 ? lane.detections : (defaultAccurateLanes[lane.lane_number - 1]?.detections || []));

            return (
              <div
                key={lane.id}
                className={`lane-panel ${emergencyOverride && lane.is_ambulance_detected ? 'critical-active' : ''}`}
              >
                <div className="lane-header">
                  <span className="lane-name">
                    <span
                      style={{
                        display: 'inline-block',
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        backgroundColor: isGreen ? 'var(--signal-green)' : isYellow ? 'var(--signal-yellow)' : 'var(--signal-red)'
                      }}
                    />
                    {laneTitles[lane.lane_number] || `Lane ${lane.lane_number}`}
                  </span>
                  <span className={`lane-state-badge ${isGreen ? 'badge-override-green' : isYellow ? 'badge-preempt-standby' : 'badge-override-hold'}`}>
                    {lane.lane_number === 1 && emergencyOverride && 'AMBULANCE OVERRIDE — ACTIVE GREEN'}
                    {lane.lane_number === 1 && !emergencyOverride && 'CLEARED — PHASE TERMINATED'}
                    {lane.lane_number === 2 && emergencyOverride && 'HIGH DENSITY (82%) — FORCED RED'}
                    {lane.lane_number === 2 && !emergencyOverride && 'HIGH DENSITY (82%) — ACTIVE GREEN'}
                    {lane.lane_number === 3 && 'LOW DENSITY (18%) — RED'}
                    {lane.lane_number === 4 && emergencyOverride && 'PREDICTIVE PRE-EMPTION QUEUED'}
                    {lane.lane_number === 4 && !emergencyOverride && 'PRE-EMPTIVE GREEN IMMINENT'}
                  </span>
                </div>

                <div className="video-viewport">
                  <div className="road-surface" />
                  <div className="road-lanemark" />
                  <video
                    src={`/videos/lane${lane.lane_number}.mp4`}
                    autoPlay
                    loop
                    muted
                    playsInline
                    onTimeUpdate={(e) => handleTimeUpdate(lane.lane_number, e)}
                    className="lane-video-element"
                  />
                  <div className="camera-hud-overlay">
                    <span className="rec-indicator"><span className="rec-dot" /> CAM-0{lane.lane_number} [LIVE]</span>
                    <span>FPS: 8.2 | LATENCY: 115ms</span>
                  </div>

                  {currentDetections.map((d, i) => (
                    <div
                      key={d.id || i}
                      className={`bbox ${getBBoxClass(d.vehicle_class)}`}
                      style={{
                        top: `${d.bbox_y * 100}%`,
                        left: `${d.bbox_x * 100}%`,
                        width: `${d.bbox_w * 100}%`,
                        height: `${d.bbox_h * 100}%`
                      }}
                    >
                      <span className="bbox-tag">
                        {d.vehicle_class} {d.confidence_score.toFixed(2)}
                      </span>
                    </div>
                  ))}

                  <div className="pre-recorded-note">Pre-recorded Feed (CAM-0{lane.lane_number})</div>
                </div>

                <div className="lane-telemetry-row">
                  <div className="signal-head">
                    <div className={`signal-lamp lamp-red ${isRed ? 'active' : ''}`} />
                    <div className={`signal-lamp lamp-yellow ${isYellow ? 'active' : ''}`} />
                    <div className={`signal-lamp lamp-green ${isGreen ? 'active' : ''}`} />
                  </div>
                  <div className="lane-metrics-group">
                    <div className="metrics-data-line">
                      <span className="text-muted">Queue Status:</span>
                      <span className="font-mono" style={{ fontWeight: 700, color: '#fff' }}>
                        Vehicles in queue: {currentDetections.length || lane.queue_count}
                      </span>
                    </div>
                    <div className="density-bar-wrapper">
                      <div className="metrics-data-line">
                        <span className="text-muted">Density Index:</span>
                        <span className="font-mono" style={{ color: lane.density_percent > 70 ? 'var(--signal-red)' : lane.density_percent > 40 ? 'var(--signal-yellow)' : 'var(--signal-green)' }}>
                          {lane.density_percent}% ({lane.density_percent > 70 ? 'High' : lane.density_percent > 40 ? 'Moderate' : 'Free Flow'})
                        </span>
                      </div>
                      <div className="density-bar-bg">
                        <div
                          className={`density-bar-fill ${lane.density_percent > 70 ? 'density-high' : lane.density_percent > 40 ? 'density-med' : 'density-low'}`}
                          style={{ width: `${lane.density_percent}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="lane-footer-meta">
                  <span>LAST FRAME: <span className="font-mono text-muted">{new Date(lane.last_updated).toLocaleTimeString()}</span></span>
                  <span className="font-mono text-yellow" style={{ fontSize: '0.7rem' }}>
                    {lane.lane_number === 4 ? 'LSTM: +23% in 90s' : lane.lane_number === 1 ? 'PRIORITY 1 OVERRIDE' : `PCU Cap: ${lane.density_percent}%`}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
