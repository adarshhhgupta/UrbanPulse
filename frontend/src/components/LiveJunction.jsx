import React, { useState, useEffect, useRef } from 'react';

export default function LiveJunction() {
  const [lanes, setLanes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [emergencyOverride, setEmergencyOverride] = useState(false);
  const [manualEmergency, setManualEmergency] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const [videoTracks, setVideoTracks] = useState({});
  const [activeDetections, setActiveDetections] = useState({});

  // Dynamic Signal Sequencing
  const [activeLane, setActiveLane] = useState(1); // 1, 2, 3, 4
  const [sequencerMode, setSequencerMode] = useState('adaptive'); // 'adaptive' | 'fixed'
  const [phaseDuration, setPhaseDuration] = useState(5);
  const [secondsRemaining, setSecondsRemaining] = useState(20);
  const [isCycleRunning, setIsCycleRunning] = useState(true);
  const [laneTimings, setLaneTimings] = useState({ 1: 20.0, 2: 25.0, 3: 15.0, 4: 20.0 });
  const [priorityOrder, setPriorityOrder] = useState([1, 2, 4, 3]);

  // Clean Upload-Only Feeds State (null initially until uploaded from PC)
  const [customVideoSources, setCustomVideoSources] = useState({ 1: null, 2: null, 3: null, 4: null });
  const [customVideoNames, setCustomVideoNames] = useState({ 1: null, 2: null, 3: null, 4: null });
  const [uploadingLanes, setUploadingLanes] = useState({});
  const [feedbackMessage, setFeedbackMessage] = useState(null);
  const [feedbackType, setFeedbackType] = useState('info');
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);

  // Staged files & emergency flags for lanes
  const [stagedFiles, setStagedFiles] = useState({ 1: null, 2: null, 3: null, 4: null });
  const [stagedAmbulance, setStagedAmbulance] = useState({ 1: false, 2: false, 3: false, 4: false });

  // Element and file input references
  const videoRefs = useRef({});
  const fileInputRefs = useRef({});
  const batchFileInputRef = useRef(null);

  const laneDirections = {
    1: 'Northbound',
    2: 'Eastbound',
    3: 'Southbound',
    4: 'Westbound'
  };

  // Check if at least one lane has an active video feed
  const hasAnyActiveVideo = Object.values(customVideoSources).some((src) => src !== null);
  const activeFeedsCount = Object.values(customVideoSources).filter(Boolean).length;

  // Refs for tracking async websocket callbacks without stale closure
  const hasAnyActiveVideoRef = useRef(false);
  const manualEmergencyRef = useRef(false);
  hasAnyActiveVideoRef.current = hasAnyActiveVideo;
  manualEmergencyRef.current = manualEmergency;

  // Dynamically identify which lane detected or flagged an emergency
  const detectedAmbulanceLane = Number(
    lanes.find((l) => l.is_ambulance_detected)?.lane_number ||
    Object.entries(stagedAmbulance).find(([_, isAmb]) => isAmb)?.[0] ||
    1
  );

  // Determine active green lane (locks to the emergency lane if override is engaged)
  const effectiveGreenLane = emergencyOverride ? detectedAmbulanceLane : activeLane;

  // Fetch telemetry on mount & establish WebSocket stream
  useEffect(() => {
    let ws = null;
    let reconnectTimeout = null;

    const fetchInitialLanes = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/lanes').catch(() => fetch('http://localhost:8001/api/lanes'));
        if (res.ok) {
          const data = await res.json();
          setLanes(data);
          // Only engage emergency if database explicitly has an active ambulance and we have videos
          const hasAmbInDb = data.some((l) => l.is_ambulance_detected);
          if (hasAmbInDb && hasAnyActiveVideoRef.current) {
            setEmergencyOverride(true);
          } else {
            setEmergencyOverride(false);
          }
        } else {
          setLanes([
            { id: 1, lane_number: 1, current_state: 'red', density_percent: 0.0, queue_count: 0, is_ambulance_detected: false },
            { id: 2, lane_number: 2, current_state: 'red', density_percent: 0.0, queue_count: 0, is_ambulance_detected: false },
            { id: 3, lane_number: 3, current_state: 'red', density_percent: 0.0, queue_count: 0, is_ambulance_detected: false },
            { id: 4, lane_number: 4, current_state: 'red', density_percent: 0.0, queue_count: 0, is_ambulance_detected: false }
          ]);
        }
      } catch (err) {
        setLanes([
          { id: 1, lane_number: 1, current_state: 'red', density_percent: 0.0, queue_count: 0, is_ambulance_detected: false },
          { id: 2, lane_number: 2, current_state: 'red', density_percent: 0.0, queue_count: 0, is_ambulance_detected: false },
          { id: 3, lane_number: 3, current_state: 'red', density_percent: 0.0, queue_count: 0, is_ambulance_detected: false },
          { id: 4, lane_number: 4, current_state: 'red', density_percent: 0.0, queue_count: 0, is_ambulance_detected: false }
        ]);
      } finally {
        setLoading(false);
      }
    };

    const connectWebSocket = () => {
      try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws/lanes`;
        ws = new WebSocket(wsUrl);
        ws.onopen = () => setWsConnected(true);
        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            if (msg.lanes && Array.isArray(msg.lanes)) {
              setLanes(msg.lanes);
            }
            // Only trigger emergency if active video feeds exist or manual emergency was requested
            if (msg.active_emergency) {
              if (hasAnyActiveVideoRef.current || manualEmergencyRef.current) {
                setEmergencyOverride(true);
              }
            } else if (!manualEmergencyRef.current) {
              setEmergencyOverride(false);
            }
          } catch (e) {
            console.error('Error parsing WS telemetry:', e);
          }
        };
        ws.onerror = () => setWsConnected(false);
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

  // Sync bounding boxes to video playback time
  const handleTimeUpdate = (laneNumber, e) => {
    const laneTrack = videoTracks ? (videoTracks[laneNumber] || videoTracks[String(laneNumber)]) : null;
    if (laneTrack && laneTrack.steps && laneTrack.steps.length > 0) {
      const steps = laneTrack.steps;
      const trackDuration = laneTrack.duration || (steps.length * 0.5);
      const currentTime = e.target.currentTime;
      const loopTime = trackDuration > 0 ? (currentTime % trackDuration) : 0;

      let closestStep = steps[0];
      let minDiff = Math.abs((steps[0].time || 0) - loopTime);
      for (let i = 1; i < steps.length; i++) {
        const stepTime = steps[i].time !== undefined ? steps[i].time : (i * 0.5);
        const diff = Math.abs(stepTime - loopTime);
        if (diff < minDiff) {
          minDiff = diff;
          closestStep = steps[i];
        }
      }

      if (closestStep && closestStep.detections && closestStep.detections.length > 0) {
        setActiveDetections((prev) => ({
          ...prev,
          [laneNumber]: closestStep.detections
        }));
      }
    }
  };

  // Video play/pause synchronization
  useEffect(() => {
    [1, 2, 3, 4].forEach((laneNum) => {
      const vid = videoRefs.current[laneNum];
      if (!vid) return;

      if (laneNum === effectiveGreenLane && customVideoSources[laneNum]) {
        vid.play().catch(() => {});
      } else {
        vid.pause();
      }
    });
  }, [effectiveGreenLane, isCycleRunning, customVideoSources]);

  // Automated Signal Countdown Sequencer (Active only when videos exist)
  useEffect(() => {
    if (emergencyOverride || !isCycleRunning || !hasAnyActiveVideo) return;

    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          setActiveLane((curr) => {
            let next = (curr % 4) + 1;
            const nextDuration = sequencerMode === 'adaptive'
              ? Math.round(laneTimings[next] || laneTimings[String(next)] || 18)
              : phaseDuration;
            setSecondsRemaining(nextDuration);
            return next;
          });
          return 1;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [emergencyOverride, isCycleRunning, sequencerMode, phaseDuration, laneTimings, hasAnyActiveVideo]);

  // Direct video upload trigger from PC folder for a single lane
  const handleFileSelect = (laneNumber, file, manualAmb = false) => {
    if (!file) return;

    // Create immediate local object URL for instant zero-latency playback
    const localBlobUrl = URL.createObjectURL(file);
    setCustomVideoSources((prev) => ({ ...prev, [laneNumber]: localBlobUrl }));
    setCustomVideoNames((prev) => ({ ...prev, [laneNumber]: file.name }));

    const isAmb = manualAmb || stagedAmbulance[laneNumber] || file.name.toLowerCase().includes('ambulance') || file.name.toLowerCase().includes('emergency');
    if (isAmb) {
      setStagedAmbulance((prev) => ({ ...prev, [laneNumber]: true }));
    }
    setStagedFiles((prev) => ({ ...prev, [laneNumber]: file }));

    // Trigger YOLOv8 inference upload
    uploadVideoToServer(laneNumber, file, isAmb);
  };

  const uploadVideoToServer = async (laneNumber, file, isAmb) => {
    setUploadingLanes((prev) => ({ ...prev, [laneNumber]: true }));
    setFeedbackMessage(`⚡ Analyzing Lane ${laneNumber} video with YOLOv8 Neural Model...`);
    setFeedbackType('info');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('manual_ambulance', isAmb ? 'true' : 'false');

    try {
      const res = await fetch(`/api/lanes/${laneNumber}/upload-video`, {
        method: 'POST',
        body: formData
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail || `Server error: ${res.status}`);
      }

      const data = await res.json();

      if (data.all_lanes) setLanes(data.all_lanes);
      if (data.video_metrics) {
        setVideoTracks((prev) => ({
          ...prev,
          [laneNumber]: data.video_metrics,
          [String(laneNumber)]: data.video_metrics
        }));

        if (data.video_metrics.is_ambulance_detected) {
          setEmergencyOverride(true);
        } else {
          // Check if any other lane still has an ambulance
          const anyOtherAmb = (data.all_lanes || []).some((l) => l.is_ambulance_detected && l.lane_number !== laneNumber);
          if (!anyOtherAmb && !manualEmergency) {
            setEmergencyOverride(false);
          }
        }
      }

      if (data.decision && data.decision.lane_timings) {
        setLaneTimings(data.decision.lane_timings);
      }

      const qCount = data.video_metrics?.queue_count ?? 0;
      const dPct = data.video_metrics?.density_percent ?? 0;
      const gSec = data.video_metrics?.allocated_green_seconds ?? 15;

      setFeedbackMessage(
        `✓ Lane ${laneNumber} Ingested: YOLOv8 detected ${qCount} vehicles (${dPct}% PCU). Dynamic Green: ${gSec}s.`
      );
      setFeedbackType('success');
    } catch (err) {
      setFeedbackMessage(`Error analyzing Lane ${laneNumber}: ${err.message}`);
      setFeedbackType('error');
    } finally {
      setUploadingLanes((prev) => ({ ...prev, [laneNumber]: false }));
      setTimeout(() => setFeedbackMessage(null), 5000);
    }
  };

  // Batch upload up to 4 arbitrary videos selected simultaneously from PC folder
  const handleBatchFilesSelected = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setIsBatchProcessing(true);
    setFeedbackMessage(`⚡ Ingesting ${files.length} videos from PC folder with YOLOv8 Neural Model...`);
    setFeedbackType('info');

    const newSources = { ...customVideoSources };
    const newNames = { ...customVideoNames };
    const newStaged = { ...stagedFiles };
    const newAmb = { ...stagedAmbulance };

    files.slice(0, 4).forEach((file, idx) => {
      const laneNum = idx + 1;
      newSources[laneNum] = URL.createObjectURL(file);
      newNames[laneNum] = file.name;
      newStaged[laneNum] = file;
      const isAmb = file.name.toLowerCase().includes('ambulance') || file.name.toLowerCase().includes('emergency') || newAmb[laneNum];
      newAmb[laneNum] = isAmb;
    });

    setCustomVideoSources(newSources);
    setCustomVideoNames(newNames);
    setStagedFiles(newStaged);
    setStagedAmbulance(newAmb);

    const formData = new FormData();
    if (newStaged[1]) formData.append('lane1', newStaged[1]);
    if (newStaged[2]) formData.append('lane2', newStaged[2]);
    if (newStaged[3]) formData.append('lane3', newStaged[3]);
    if (newStaged[4]) formData.append('lane4', newStaged[4]);

    const ambLane = [1, 2, 3, 4].find((l) => newAmb[l]);
    if (ambLane) formData.append('ambulance_lane', ambLane);

    try {
      const res = await fetch('/api/lanes/upload-all-videos', {
        method: 'POST',
        body: formData
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail || `Server error: ${res.status}`);
      }

      const data = await res.json();
      if (data.lanes) setLanes(data.lanes);
      if (data.results) {
        setVideoTracks((prev) => ({ ...prev, ...data.results }));
      }
      if (data.decision && data.decision.lane_timings) {
        setLaneTimings(data.decision.lane_timings);
      }
      if (data.decision && data.decision.rule_triggered === 'emergency') {
        setEmergencyOverride(true);
      } else if (!manualEmergency) {
        setEmergencyOverride(false);
      }

      setFeedbackMessage(`✓ Ingested ${files.length} lane video feeds! Dynamic signal timings arbitrated.`);
      setFeedbackType('success');
    } catch (err) {
      setFeedbackMessage(`Batch upload error: ${err.message}`);
      setFeedbackType('error');
    } finally {
      setIsBatchProcessing(false);
      setTimeout(() => setFeedbackMessage(null), 5000);
      if (batchFileInputRef.current) batchFileInputRef.current.value = '';
    }
  };

  // Load sample demo benchmark videos for 1-click test
  const handleLoadSampleDemos = async () => {
    setFeedbackMessage('Loading 4 sample demo benchmark videos for demonstration...');
    setFeedbackType('info');

    setCustomVideoSources({
      1: '/videos/lane1.mp4',
      2: '/videos/lane2.mp4',
      3: '/videos/lane3.mp4',
      4: '/videos/lane4.mp4'
    });
    setCustomVideoNames({
      1: 'demo_lane1_ambulance.mp4',
      2: 'demo_lane2_congested.mp4',
      3: 'demo_lane3_transit.mp4',
      4: 'demo_lane4_arterial.mp4'
    });
    setStagedAmbulance({ 1: true, 2: false, 3: false, 4: false });

    try {
      await fetch('/api/lanes/reset-defaults', { method: 'POST' }).catch(() => {});
      const res = await fetch(`/videos/detections_data.json?t=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        setVideoTracks(data);
      }
      const planRes = await fetch('/api/lanes/signal-plan');
      if (planRes.ok) {
        const plan = await planRes.json();
        if (plan.lane_timings) setLaneTimings(plan.lane_timings);
        if (plan.rule_triggered === 'emergency') {
          setEmergencyOverride(true);
        }
      }
      const lanesRes = await fetch('/api/lanes');
      if (lanesRes.ok) {
        const lData = await lanesRes.json();
        setLanes(lData);
      }
      setFeedbackMessage('✓ 4 Benchmark demo videos loaded with calibrated detections.');
      setFeedbackType('success');
    } catch (e) {
      setFeedbackMessage('Demo benchmark videos loaded.');
    } finally {
      setTimeout(() => setFeedbackMessage(null), 3500);
    }
  };

  // Clear all feeds back to clean standby state
  const handleClearAllFeeds = async () => {
    setCustomVideoSources({ 1: null, 2: null, 3: null, 4: null });
    setCustomVideoNames({ 1: null, 2: null, 3: null, 4: null });
    setStagedFiles({ 1: null, 2: null, 3: null, 4: null });
    setStagedAmbulance({ 1: false, 2: false, 3: false, 4: false });
    setActiveDetections({});
    setEmergencyOverride(false);
    setManualEmergency(false);
    setActiveLane(1);
    setSecondsRemaining(20);

    // Call backend reset to clean standby
    try {
      await fetch('/api/lanes/clear-all', { method: 'POST' }).catch(() =>
        fetch('http://localhost:8001/api/lanes/clear-all', { method: 'POST' })
      );
    } catch (e) {
      console.error('Failed clearing lanes:', e);
    }

    setLanes([
      { id: 1, lane_number: 1, current_state: 'red', density_percent: 0.0, queue_count: 0, is_ambulance_detected: false },
      { id: 2, lane_number: 2, current_state: 'red', density_percent: 0.0, queue_count: 0, is_ambulance_detected: false },
      { id: 3, lane_number: 3, current_state: 'red', density_percent: 0.0, queue_count: 0, is_ambulance_detected: false },
      { id: 4, lane_number: 4, current_state: 'red', density_percent: 0.0, queue_count: 0, is_ambulance_detected: false }
    ]);

    setFeedbackMessage('✓ All feeds cleared. Standby mode active. Ready for new video uploads.');
    setFeedbackType('success');
    setTimeout(() => setFeedbackMessage(null), 3000);
  };

  const toggleEmergency = () => {
    if (!emergencyOverride) {
      setManualEmergency(true);
      setEmergencyOverride(true);
      setSecondsRemaining(60);
    } else {
      setManualEmergency(false);
      setEmergencyOverride(false);
      setSecondsRemaining(laneTimings[activeLane] || 20);
    }
  };

  const selectLane = (laneNum) => {
    setEmergencyOverride(false);
    setManualEmergency(false);
    setActiveLane(laneNum);
    const dur = sequencerMode === 'adaptive' ? (laneTimings[laneNum] || 20) : phaseDuration;
    setSecondsRemaining(dur);
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
      case 'pedestrian':
      case 'person':
        return 'bbox-pedestrian';
      default:
        return 'bbox-car';
    }
  };

  return (
    <section id="live-junction">
      {/* Section Header */}
      <div className="section-header">
        <div className="section-tag">Edge Perception Studio & Demand-Responsive Signal Control</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 className="section-title">
              <svg className="icon text-green" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              Live 4-Lane Junction Perception & Control
            </h2>
            <p className="section-desc">
              Upload traffic videos directly into each lane viewport or batch ingest all 4 feeds. YOLOv8 runs real-time object detection across vehicles, computes dynamic PCU road density, and arbitrates green signal timings.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span className="font-mono" style={{ fontSize: '0.75rem', color: wsConnected ? 'var(--signal-green)' : 'var(--signal-yellow)' }}>
              {wsConnected ? '● WS Live Stream' : '○ Standby Snapshot'}
            </span>
          </div>
        </div>

        {/* Global Feedback Banner */}
        {feedbackMessage && (
          <div className={`upload-feedback-banner ${feedbackType === 'error' ? 'feedback-error' : 'feedback-success'}`}>
            <span>{feedbackMessage}</span>
            <button className="remove-file-btn" onClick={() => setFeedbackMessage(null)}>✕</button>
          </div>
        )}
      </div>

      {/* =========================================================================
          UNIFIED ORCHESTRATION & INGESTION TOOLBAR (NO DUPLICATE CARDS)
          ========================================================================= */}
      <div className="junction-orchestration-bar">
        <div className="orchestration-left">
          {/* Active Feeds Indicator */}
          <div className="stream-status-pill font-mono">
            <span
              className="pulse-dot"
              style={{
                backgroundColor: hasAnyActiveVideo ? 'var(--signal-green)' : '#64748b',
                boxShadow: hasAnyActiveVideo ? '0 0 8px var(--signal-green)' : 'none'
              }}
            />
            <span>
              {hasAnyActiveVideo
                ? `● ACTIVE: ${activeFeedsCount}/4 FEEDS STREAMING`
                : '○ STANDBY: 0/4 FEEDS (READY FOR PC UPLOADS)'}
            </span>
          </div>

          {/* Hidden Multi-file picker for batch uploads */}
          <input
            ref={batchFileInputRef}
            type="file"
            multiple
            accept="video/*,.mp4,.avi,.mov,.mkv,.webm"
            style={{ display: 'none' }}
            onChange={handleBatchFilesSelected}
          />

          {/* Batch Upload Button */}
          <button
            className="btn-batch-upload"
            disabled={isBatchProcessing}
            onClick={() => batchFileInputRef.current?.click()}
            title="Select up to 4 video files simultaneously from your PC folder to populate all lanes"
          >
            <svg className="icon icon-sm" viewBox="0 0 24 24">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            {isBatchProcessing ? '⚡ Analyzing All Feeds...' : '📁 Batch Upload (1–4 Videos)'}
          </button>

          {/* Sample benchmark videos */}
          <button
            className="load-sample-btn"
            onClick={handleLoadSampleDemos}
            title="Populate 4 calibrated benchmark sample demo videos"
          >
            ▶ Load Benchmark Demo
          </button>

          {/* Clear all feeds */}
          <button
            className="reset-benchmark-btn"
            onClick={handleClearAllFeeds}
            title="Reset all lane feeds, clear detections, and return to clean standby"
          >
            🗑 Clear Feeds
          </button>
        </div>

        <div className="orchestration-right">
          {/* Sequencer Strategy */}
          <div className="sequencer-mode-pill font-mono" title="Signal Sequencing Strategy">
            <button
              className={`mode-tab-btn ${sequencerMode === 'adaptive' ? 'active' : ''}`}
              onClick={() => setSequencerMode('adaptive')}
              title="Green phase duration dynamically matches detected vehicle queue"
            >
              ⚡ Dynamic (YOLO)
            </button>
            <button
              className={`mode-tab-btn ${sequencerMode === 'fixed' ? 'active' : ''}`}
              onClick={() => setSequencerMode('fixed')}
              title="Fixed rapid test duration"
            >
              ⏱ Fixed
            </button>
          </div>

          {sequencerMode === 'fixed' && (
            <div className="phase-duration-selector font-mono" title="Fixed cycle duration">
              {[5, 8, 10].map((sec) => (
                <button
                  key={sec}
                  className={`timer-chip ${phaseDuration === sec ? 'active' : ''}`}
                  onClick={() => {
                    setPhaseDuration(sec);
                    setSecondsRemaining(sec);
                  }}
                >
                  {sec}s
                </button>
              ))}
            </div>
          )}

          {/* Play/Pause Cycle */}
          <button
            className="sim-btn"
            onClick={() => setIsCycleRunning(!isCycleRunning)}
            title={isCycleRunning ? 'Pause signal sequencing' : 'Resume signal sequencing'}
            style={{ borderColor: isCycleRunning ? 'var(--signal-green)' : 'var(--signal-yellow)' }}
          >
            {isCycleRunning ? '⏸ Pause' : '▶ Resume'}
          </button>

          {/* Force Lane Jump */}
          <div className="lane-quick-selectors font-mono" title="Force green on specific approach">
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginRight: 2 }}>FORCE:</span>
            {[1, 2, 3, 4].map((num) => (
              <button
                key={num}
                className={`lane-selector-btn ${effectiveGreenLane === num ? 'active' : ''}`}
                onClick={() => selectLane(num)}
              >
                L{num}
              </button>
            ))}
          </div>

          {/* Emergency Ambulance Override */}
          <button className={`sim-btn ${emergencyOverride ? 'sim-btn-active' : ''}`} onClick={toggleEmergency}>
            <svg className="icon icon-sm text-critical" viewBox="0 0 24 24">
              <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            {emergencyOverride ? '🚨 Cancel Emergency' : '🚑 Trigger Ambulance'}
          </button>
        </div>
      </div>

      {/* =========================================================================
          EMERGENCY CORRIDOR BANNER (DYNAMIC TO DETECTED LANE, ONLY IF ACTIVE)
          ========================================================================= */}
      {emergencyOverride && (hasAnyActiveVideo || manualEmergency) && (
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
              <div className="emergency-title">
                EMERGENCY OVERRIDE ENGAGED — AMBULANCE DETECTED IN LANE {detectedAmbulanceLane}
              </div>
              <div className="emergency-sub">
                Corridor Clearing: Opposing lanes locked to <strong style={{ color: '#fff' }}>RED</strong>. Lane {detectedAmbulanceLane} ({laneDirections[detectedAmbulanceLane]}) green corridor active. Next downstream node Junction 7 pre-empted via MQTT.
              </div>
            </div>
          </div>
          <div className="emergency-meta-chip font-mono">
            PRIORITY: <span className="text-green" style={{ fontWeight: 700 }}>TIER 1</span> | OVERRIDE PHASE: {secondsRemaining}s
          </div>
        </div>
      )}

      {/* =========================================================================
          MAIN 4-LANE PERCEPTION & CONTROL GRID (SINGLE SOURCE OF TRUTH)
          ========================================================================= */}
      {loading ? (
        <div className="loading-box">Initializing Quad-Stream Feed Telemetry...</div>
      ) : (
        <div className="lanes-grid">
          {[1, 2, 3, 4].map((laneNumber) => {
            const lane = lanes.find((l) => l.lane_number === laneNumber) || {
              id: laneNumber,
              lane_number: laneNumber,
              current_state: 'red',
              density_percent: 0.0,
              queue_count: 0,
              is_ambulance_detected: false
            };

            const videoSrc = customVideoSources[laneNumber];
            const customName = customVideoNames[laneNumber];
            const hasVideo = videoSrc !== null;
            const isUploading = uploadingLanes[laneNumber];

            const isGreen = hasVideo && (laneNumber === effectiveGreenLane);
            const isRed = hasVideo && !isGreen;
            const isYellow = false;

            // Detections
            const laneTracked = activeDetections[laneNumber];
            const currentDetections = hasVideo ? (laneTracked || lane.detections || []) : [];

            const vehicleCount = hasVideo
              ? (currentDetections.filter((d) => d.vehicle_class !== 'pedestrian' && d.vehicle_class !== 'person').length || lane.queue_count)
              : 0;

            const pedCount = hasVideo
              ? currentDetections.filter((d) => d.vehicle_class === 'pedestrian' || d.vehicle_class === 'person').length
              : 0;

            const isThisLaneEmergency = (emergencyOverride && laneNumber === detectedAmbulanceLane) || lane.is_ambulance_detected;
            const allocatedGreen = laneTimings[laneNumber] || (isThisLaneEmergency ? 60.0 : 20.0);

            let badgeText = '';
            let badgeClass = 'badge-override-standby';

            if (!hasVideo) {
              badgeText = 'AWAITING VIDEO FEED';
              badgeClass = 'badge-override-standby';
            } else if (emergencyOverride) {
              if (laneNumber === detectedAmbulanceLane) {
                badgeText = `AMBULANCE OVERRIDE — GREEN (${secondsRemaining}s)`;
                badgeClass = 'badge-override-green';
              } else {
                badgeText = 'EMERGENCY HOLD — RED (PAUSED)';
                badgeClass = 'badge-override-hold';
              }
            } else {
              if (isGreen) {
                badgeText = `ACTIVE GREEN (${secondsRemaining}s REMAINING)`;
                badgeClass = 'badge-override-green';
              } else {
                badgeText = 'HOLDING RED (WAITING)';
                badgeClass = 'badge-override-hold';
              }
            }

            return (
              <div
                key={laneNumber}
                className={`lane-panel ${isThisLaneEmergency ? 'critical-active' : ''} ${isGreen ? 'active-green-phase' : ''}`}
              >
                {/* Lane Card Header */}
                <div className="lane-header">
                  <span className="lane-name">
                    <span
                      style={{
                        display: 'inline-block',
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        backgroundColor: hasVideo
                          ? (isGreen ? 'var(--signal-green)' : 'var(--signal-red)')
                          : '#64748b',
                        boxShadow: isGreen ? '0 0 8px var(--signal-green)' : 'none'
                      }}
                    />
                    Lane {laneNumber} ({laneDirections[laneNumber]})
                  </span>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    {hasVideo && (
                      <>
                        <button
                          className="lane-quick-upload-trigger"
                          onClick={() => fileInputRefs.current[laneNumber]?.click()}
                          title="Replace video for this lane"
                        >
                          🔄 Replace
                        </button>
                        <button
                          className="lane-quick-remove-trigger"
                          onClick={() => {
                            setCustomVideoSources((prev) => ({ ...prev, [laneNumber]: null }));
                            setCustomVideoNames((prev) => ({ ...prev, [laneNumber]: null }));
                            setStagedFiles((prev) => ({ ...prev, [laneNumber]: null }));
                            setStagedAmbulance((prev) => ({ ...prev, [laneNumber]: false }));
                            if (fileInputRefs.current[laneNumber]) fileInputRefs.current[laneNumber].value = '';
                          }}
                          title="Remove video from this lane"
                        >
                          ✕
                        </button>
                      </>
                    )}
                    <span className={`lane-state-badge ${badgeClass}`}>{badgeText}</span>
                  </div>
                </div>

                {/* Hidden File Input for this specific lane */}
                <input
                  ref={(el) => (fileInputRefs.current[laneNumber] = el)}
                  type="file"
                  accept="video/*,.mp4,.avi,.mov,.mkv,.webm"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileSelect(laneNumber, e.target.files[0], stagedAmbulance[laneNumber]);
                    }
                  }}
                />

                {/* Video Viewport: Clean Standby Upload Placeholder OR Active Stream */}
                <div
                  className="video-viewport"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                      handleFileSelect(laneNumber, e.dataTransfer.files[0], stagedAmbulance[laneNumber]);
                    }
                  }}
                >
                  <div className="road-surface" />
                  <div className="road-lanemark" />

                  {/* Neural Scanning Radar Overlay when analyzing */}
                  {isUploading && (
                    <div className="video-analyzing-overlay">
                      <div className="radar-spinner" />
                      <div className="analyzing-title">Running YOLOv8 Neural Inference</div>
                      <div className="analyzing-subtitle font-mono">
                        Sampling video frames • Extracting bounding boxes • Computing PCU traffic density
                      </div>
                    </div>
                  )}

                  {!hasVideo ? (
                    /* STANDBY VIEWPORT DROPZONE & PC BROWSE */
                    <div
                      className="viewport-empty-placeholder"
                      onClick={() => fileInputRefs.current[laneNumber]?.click()}
                      title={`Click or drop a video file from your computer for Lane ${laneNumber}`}
                    >
                      <div className="placeholder-icon-circle">
                        <svg className="icon icon-lg" viewBox="0 0 24 24">
                          <polygon points="23 7 16 12 23 17 23 7" />
                          <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                        </svg>
                      </div>
                      <div className="placeholder-title">Lane {laneNumber} Feed Standby</div>
                      <div className="placeholder-desc">
                        Drag & drop traffic video from PC or click to browse
                      </div>
                      <button
                        className="placeholder-browse-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          fileInputRefs.current[laneNumber]?.click();
                        }}
                      >
                        📁 Choose Video File from PC
                      </button>

                      {/* Manual Ambulance / Emergency Flag Toggle */}
                      <div
                        className="placeholder-amb-toggle"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <label className="ambulance-checkbox-row">
                          <input
                            type="checkbox"
                            checked={stagedAmbulance[laneNumber] || false}
                            onChange={(e) =>
                              setStagedAmbulance((prev) => ({ ...prev, [laneNumber]: e.target.checked }))
                            }
                          />
                          <span>🚑 Video Contains Emergency Vehicle</span>
                        </label>
                      </div>

                      <span className="placeholder-hint">Supports MP4, AVI, MOV, MKV, WEBM</span>
                    </div>
                  ) : (
                    /* ACTIVE VIDEO STREAM & YOLOV8 DETECTIONS */
                    <>
                      <video
                        ref={(el) => {
                          if (el) {
                            videoRefs.current[laneNumber] = el;
                            if (laneNumber === effectiveGreenLane) {
                              el.play().catch(() => {});
                            } else {
                              el.pause();
                            }
                          }
                        }}
                        src={videoSrc}
                        loop
                        muted
                        playsInline
                        onTimeUpdate={(e) => handleTimeUpdate(laneNumber, e)}
                        className="lane-video-element"
                      />

                      {/* Flow Status Pill Badge */}
                      <div className={`lane-flow-pill ${isGreen ? 'pill-green' : 'pill-red'}`}>
                        <span className={`flow-dot ${isGreen ? 'green' : 'red'}`} />
                        <span>
                          {isGreen
                            ? `GREEN FLOW (${secondsRemaining}s / ${allocatedGreen}s)`
                            : 'RED SIGNAL • PAUSED'}
                        </span>
                      </div>

                      {/* Camera HUD Overlay */}
                      <div className="camera-hud-overlay">
                        <span className="rec-indicator">
                          <span className={isGreen ? 'rec-dot' : 'rec-dot paused'} />
                          CAM-0{laneNumber} [{isGreen ? 'FLOWING' : 'HOLDING'}]
                        </span>
                        <span className="feed-origin-badge origin-custom">
                          ● PC Feed: {customName ? (customName.length > 20 ? customName.substring(0, 18) + '...' : customName) : 'User Video'}
                        </span>
                      </div>

                      {/* YOLOv8 Detection Bounding Boxes */}
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
                            {d.vehicle_class} {d.confidence_score ? d.confidence_score.toFixed(2) : '0.92'}
                          </span>
                        </div>
                      ))}
                    </>
                  )}
                </div>

                {/* Telemetry Row with Signal Head */}
                <div className="lane-telemetry-row">
                  <div className="signal-head">
                    <div className={`signal-lamp lamp-red ${isRed ? 'active' : ''}`} />
                    <div className={`signal-lamp lamp-yellow ${isYellow || !hasVideo ? 'active' : ''}`} style={!hasVideo ? { opacity: 0.3 } : {}} />
                    <div className={`signal-lamp lamp-green ${isGreen ? 'active' : ''}`} />
                  </div>

                  <div className="lane-metrics-group">
                    <div className="metrics-data-line">
                      <span className="text-muted">Detected Queue:</span>
                      <span className="font-mono" style={{ fontWeight: 700, color: hasVideo ? '#fff' : '#64748b' }}>
                        {hasVideo ? (
                          <>
                            {vehicleCount} Vehicles
                            {pedCount > 0 && (
                              <span style={{ color: '#10b981', marginLeft: '0.4rem', fontWeight: 600 }}>
                                • {pedCount} Pedestrians
                              </span>
                            )}
                            {lane.is_ambulance_detected && (
                              <span style={{ color: '#f43f5e', marginLeft: '0.4rem', fontWeight: 700 }}>
                                • 🚑 Ambulance
                              </span>
                            )}
                          </>
                        ) : (
                          '-- (Standby)'
                        )}
                      </span>
                    </div>

                    <div className="density-bar-wrapper">
                      <div className="metrics-data-line">
                        <span className="text-muted">PCU Density Index:</span>
                        <span
                          className="font-mono"
                          style={{
                            color: !hasVideo
                              ? '#64748b'
                              : isGreen
                              ? 'var(--signal-green)'
                              : lane.density_percent > 70
                              ? 'var(--signal-red)'
                              : 'var(--signal-yellow)'
                          }}
                        >
                          {hasVideo
                            ? `${lane.density_percent}% (${isGreen ? 'Active Discharge' : lane.density_percent > 70 ? 'High Congestion' : 'Normal Queue'})`
                            : '0.0% (Standby)'}
                        </span>
                      </div>
                      <div className="density-bar-bg">
                        <div
                          className={`density-bar-fill ${
                            lane.density_percent > 70
                              ? 'density-high'
                              : lane.density_percent > 40
                              ? 'density-med'
                              : 'density-low'
                          }`}
                          style={{ width: `${hasVideo ? lane.density_percent : 0}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Telemetry */}
                <div className="lane-footer-meta">
                  <span>
                    SIGNAL:{' '}
                    <span className="font-mono" style={{ color: !hasVideo ? '#64748b' : isGreen ? 'var(--signal-green)' : 'var(--signal-red)', fontWeight: 700 }}>
                      {!hasVideo ? 'OFFLINE [STANDBY]' : isGreen ? 'GREEN [FLOWING]' : 'RED [WAITING]'}
                    </span>
                  </span>
                  <span className="font-mono text-yellow" style={{ fontSize: '0.7rem' }}>
                    {!hasVideo
                      ? 'No Feed'
                      : isThisLaneEmergency
                      ? 'EMERGENCY OVERRIDE (60s)'
                      : `Dynamic Green: ${allocatedGreen}s`}
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
