import React, { useState, useEffect, useRef } from 'react';

export default function LiveJunction() {
  const [lanes, setLanes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [emergencyOverride, setEmergencyOverride] = useState(false);
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

  // Clean Upload-Only Mode State (null initially until uploaded from PC)
  const [customVideoSources, setCustomVideoSources] = useState({ 1: null, 2: null, 3: null, 4: null });
  const [customVideoNames, setCustomVideoNames] = useState({ 1: null, 2: null, 3: null, 4: null });
  const [uploadingLanes, setUploadingLanes] = useState({});
  const [feedbackMessage, setFeedbackMessage] = useState(null);
  const [feedbackType, setFeedbackType] = useState('info');
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);
  const [studioOpen, setStudioOpen] = useState(true);

  // Staged files for batch upload
  const [stagedFiles, setStagedFiles] = useState({ 1: null, 2: null, 3: null, 4: null });
  const [stagedAmbulance, setStagedAmbulance] = useState({ 1: false, 2: false, 3: false, 4: false });

  // References to video elements & file inputs
  const videoRefs = useRef({});
  const fileInputRefs = useRef({});

  const laneDirections = {
    1: 'Northbound',
    2: 'Eastbound',
    3: 'Southbound',
    4: 'Westbound'
  };

  // Determine active green lane (locks to emergency lane if triggered)
  const effectiveGreenLane = emergencyOverride ? 1 : activeLane;

  // Check if at least one lane has an active video feed
  const hasAnyActiveVideo = Object.values(customVideoSources).some((src) => src !== null);

  // Fetch telemetry & signal plan on mount
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
        } else {
          // Initialize clean standby lane models
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
            if (msg.active_emergency) {
              setEmergencyOverride(true);
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
            // Find next approach (prefer approaches with active videos if available)
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

  // Direct video upload trigger from PC folder
  const handleFileSelect = (laneNumber, file) => {
    if (!file) return;

    // 1. Create immediate local object URL for instant zero-latency playback
    const localBlobUrl = URL.createObjectURL(file);
    setCustomVideoSources((prev) => ({ ...prev, [laneNumber]: localBlobUrl }));
    setCustomVideoNames((prev) => ({ ...prev, [laneNumber]: file.name }));

    const isAmb = file.name.toLowerCase().includes('ambulance') || file.name.toLowerCase().includes('emergency');
    if (isAmb) {
      setStagedAmbulance((prev) => ({ ...prev, [laneNumber]: true }));
    }
    setStagedFiles((prev) => ({ ...prev, [laneNumber]: file }));

    // 2. Automatically trigger YOLOv8 inference upload
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

  // Batch upload for all staged videos
  const handleBatchUploadAll = async () => {
    const activeLanes = [1, 2, 3, 4].filter((l) => stagedFiles[l] !== null);
    if (activeLanes.length === 0) {
      setFeedbackMessage('Please select at least one video file from your computer.');
      setFeedbackType('error');
      setTimeout(() => setFeedbackMessage(null), 3500);
      return;
    }

    setIsBatchProcessing(true);
    setFeedbackMessage('⚡ Multi-Approaches Ingestion: Running YOLOv8 across all staged lane feeds...');
    setFeedbackType('info');

    const formData = new FormData();
    if (stagedFiles[1]) formData.append('lane1', stagedFiles[1]);
    if (stagedFiles[2]) formData.append('lane2', stagedFiles[2]);
    if (stagedFiles[3]) formData.append('lane3', stagedFiles[3]);
    if (stagedFiles[4]) formData.append('lane4', stagedFiles[4]);

    const ambLane = [1, 2, 3, 4].find((l) => stagedAmbulance[l]);
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
      }

      setFeedbackMessage('✓ Successfully processed all uploaded videos! Dynamic signal timings arbitrated.');
      setFeedbackType('success');
    } catch (err) {
      setFeedbackMessage(`Batch upload error: ${err.message}`);
      setFeedbackType('error');
    } finally {
      setIsBatchProcessing(false);
      setTimeout(() => setFeedbackMessage(null), 5000);
    }
  };

  // Optional: Load sample demo videos for quick demonstration
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

    try {
      const res = await fetch(`/videos/detections_data.json?t=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        setVideoTracks(data);
      }
      const planRes = await fetch('/api/lanes/signal-plan');
      if (planRes.ok) {
        const plan = await planRes.json();
        if (plan.lane_timings) setLaneTimings(plan.lane_timings);
      }
      setFeedbackMessage('✓ Sample demo videos loaded successfully.');
      setFeedbackType('success');
    } catch (e) {
      setFeedbackMessage('Demo videos loaded.');
    } finally {
      setTimeout(() => setFeedbackMessage(null), 3500);
    }
  };

  // Clear all feeds back to clean upload-only state
  const handleClearAllFeeds = async () => {
    setCustomVideoSources({ 1: null, 2: null, 3: null, 4: null });
    setCustomVideoNames({ 1: null, 2: null, 3: null, 4: null });
    setStagedFiles({ 1: null, 2: null, 3: null, 4: null });
    setStagedAmbulance({ 1: false, 2: false, 3: false, 4: false });
    setActiveDetections({});
    setEmergencyOverride(false);
    setActiveLane(1);
    setSecondsRemaining(20);

    setLanes([
      { id: 1, lane_number: 1, current_state: 'red', density_percent: 0.0, queue_count: 0, is_ambulance_detected: false },
      { id: 2, lane_number: 2, current_state: 'red', density_percent: 0.0, queue_count: 0, is_ambulance_detected: false },
      { id: 3, lane_number: 3, current_state: 'red', density_percent: 0.0, queue_count: 0, is_ambulance_detected: false },
      { id: 4, lane_number: 4, current_state: 'red', density_percent: 0.0, queue_count: 0, is_ambulance_detected: false }
    ]);

    setFeedbackMessage('✓ Feeds cleared. Ready for your custom PC video uploads.');
    setFeedbackType('success');
    setTimeout(() => setFeedbackMessage(null), 3000);
  };

  const toggleEmergency = () => {
    if (!emergencyOverride) {
      setEmergencyOverride(true);
      setActiveLane(1);
      setSecondsRemaining(60);
    } else {
      setEmergencyOverride(false);
      setActiveLane(1);
      setSecondsRemaining(laneTimings[1] || 20);
    }
  };

  const selectLane = (laneNum) => {
    setEmergencyOverride(false);
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
              Upload any 4 traffic videos from your PC folder. YOLOv8 runs real-time object detection across vehicles and pedestrians, computes dynamic PCU road density, and arbitrates green signal timings.
            </p>
          </div>

          {/* Junction Toolbar Controls */}
          <div className="cycle-toolbar">
            <span className="font-mono" style={{ fontSize: '0.75rem', color: wsConnected ? 'var(--signal-green)' : 'var(--signal-yellow)' }}>
              {wsConnected ? '● WS Live Stream' : '○ Standby Snapshot'}
            </span>

            {/* Toggle Studio Panel */}
            <button
              className={`sim-btn ${studioOpen ? 'sim-btn-active' : ''}`}
              onClick={() => setStudioOpen(!studioOpen)}
              title="Open PC Video Upload Studio"
            >
              <svg className="icon icon-sm" viewBox="0 0 24 24">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              {studioOpen ? '📂 Hide Upload Studio' : '📂 Upload Videos from PC'}
            </button>

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

            {/* Fixed Mode Duration Selector */}
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

        {/* Global Feedback Banner */}
        {feedbackMessage && (
          <div className={`upload-feedback-banner ${feedbackType === 'error' ? 'feedback-error' : 'feedback-success'}`}>
            <span>{feedbackMessage}</span>
            <button className="remove-file-btn" onClick={() => setFeedbackMessage(null)}>✕</button>
          </div>
        )}
      </div>

      {/* =========================================================================
          PC VIDEO INGESTION STUDIO PANEL
          ========================================================================= */}
      {studioOpen && (
        <div className="video-studio-panel">
          <div className="studio-header">
            <div className="studio-title-box">
              <span className="studio-badge">Video Ingestion Studio</span>
              <div>
                <h3 className="studio-title">Upload 4 Traffic Videos from PC Folder</h3>
                <p className="studio-subtitle">
                  Select video files (.mp4, .avi, .mov, .mkv, .webm) for each approach from your computer. The model runs flexible YOLOv8 inference, counts vehicle queues, and computes demand-responsive green timings.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button
                className="load-sample-btn"
                onClick={handleLoadSampleDemos}
                title="Populate all 4 lanes with sample benchmark demo videos"
              >
                ▶ Load 4 Sample Demo Videos
              </button>
              <button
                className="reset-benchmark-btn"
                onClick={handleClearAllFeeds}
                title="Clear all active feeds and return to empty upload mode"
              >
                🗑 Clear All Feeds
              </button>
            </div>
          </div>

          {/* 4-Lane File Drop Grid */}
          <div className="batch-upload-grid">
            {[1, 2, 3, 4].map((laneNum) => {
              const file = stagedFiles[laneNum];
              const isUploading = uploadingLanes[laneNum];
              const customName = customVideoNames[laneNum];
              const hasFeed = customVideoSources[laneNum] !== null;

              return (
                <div
                  key={laneNum}
                  className={`upload-lane-card ${hasFeed ? 'card-has-file' : ''} ${isUploading ? 'card-is-uploading' : ''}`}
                >
                  <div className="upload-lane-header">
                    <span className="upload-lane-tag">
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          backgroundColor: hasFeed
                            ? (effectiveGreenLane === laneNum ? 'var(--signal-green)' : 'var(--signal-red)')
                            : '#64748b'
                        }}
                      />
                      Lane {laneNum}
                    </span>
                    <span className="upload-lane-dir">{laneDirections[laneNum]}</span>
                  </div>

                  {/* Hidden file input */}
                  <input
                    ref={(el) => (fileInputRefs.current[laneNum] = el)}
                    type="file"
                    accept="video/*,.mp4,.avi,.mov,.mkv,.webm"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleFileSelect(laneNum, e.target.files[0]);
                      }
                    }}
                  />

                  {/* File Selection Box */}
                  {hasFeed ? (
                    <div className="file-selected-pill">
                      <span className="file-name-text" title={customName || `Lane ${laneNum} Video`}>
                        📹 {customName || `Lane ${laneNum} Video`}
                      </span>
                      <button
                        className="remove-file-btn"
                        title="Remove feed"
                        onClick={() => {
                          setCustomVideoSources((prev) => ({ ...prev, [laneNum]: null }));
                          setCustomVideoNames((prev) => ({ ...prev, [laneNum]: null }));
                          setStagedFiles((prev) => ({ ...prev, [laneNum]: null }));
                          if (fileInputRefs.current[laneNum]) fileInputRefs.current[laneNum].value = '';
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div
                      className="dropzone-box"
                      onClick={() => fileInputRefs.current[laneNum]?.click()}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                          handleFileSelect(laneNum, e.dataTransfer.files[0]);
                        }
                      }}
                      title="Click or drop video from PC"
                    >
                      <svg className="dropzone-icon" viewBox="0 0 24 24">
                        <polygon points="23 7 16 12 23 17 23 7" />
                        <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                      </svg>
                      <span className="dropzone-prompt">Choose Video</span>
                      <span className="dropzone-subtext">Drag & drop or browse</span>
                    </div>
                  )}

                  {/* Ambulance Priority Toggle */}
                  <label className="ambulance-checkbox-row">
                    <input
                      type="checkbox"
                      checked={stagedAmbulance[laneNum]}
                      onChange={(e) =>
                        setStagedAmbulance((prev) => ({ ...prev, [laneNum]: e.target.checked }))
                      }
                    />
                    <span>🚑 Emergency / Ambulance</span>
                  </label>

                  {/* Action button */}
                  <button
                    className="single-upload-btn"
                    disabled={isUploading || isBatchProcessing}
                    onClick={() => {
                      if (file) {
                        uploadVideoToServer(laneNum, file, stagedAmbulance[laneNum]);
                      } else {
                        fileInputRefs.current[laneNum]?.click();
                      }
                    }}
                  >
                    {isUploading ? '⚡ Analyzing...' : hasFeed ? `Re-detect L${laneNum}` : `Select Video L${laneNum}`}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Batch Actions Bar */}
          <div className="studio-actions-bar">
            <span className="font-mono text-dim" style={{ fontSize: '0.72rem' }}>
              {hasAnyActiveVideo
                ? `● ${Object.values(customVideoSources).filter(Boolean).length}/4 Lane Feeds Active`
                : '○ No videos loaded yet. Drop or choose any videos from your computer folder.'}
            </span>

            <button
              className="batch-btn-primary"
              disabled={isBatchProcessing || !Object.values(stagedFiles).some((f) => f !== null)}
              onClick={handleBatchUploadAll}
            >
              <svg className="icon icon-sm" viewBox="0 0 24 24">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
              {isBatchProcessing ? '⚡ Analyzing All Videos with YOLOv8...' : 'Ingest All Staged Videos'}
            </button>
          </div>
        </div>
      )}

      {/* Emergency Corridor Banner */}
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
                Corridor Clearing: Opposing lanes locked to <strong style={{ color: '#fff' }}>RED</strong>. Lane 1 feed actively streaming. Next downstream node Junction 7 pre-empted via MQTT.
              </div>
            </div>
          </div>
          <div className="emergency-meta-chip font-mono">
            PRIORITY: <span className="text-green" style={{ fontWeight: 700 }}>TIER 1</span> | OVERRIDE PHASE: {secondsRemaining}s
          </div>
        </div>
      )}

      {/* Main 4-Lane Surveillance & Perception Grid */}
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

            const allocatedGreen = laneTimings[laneNumber] || (laneNumber === 1 && emergencyOverride ? 60.0 : 20.0);

            let badgeText = '';
            let badgeClass = 'badge-override-standby';

            if (!hasVideo) {
              badgeText = 'AWAITING VIDEO FEED';
              badgeClass = 'badge-override-standby';
            } else if (emergencyOverride) {
              if (laneNumber === 1) {
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
                className={`lane-panel ${emergencyOverride && lane.is_ambulance_detected ? 'critical-active' : ''} ${isGreen ? 'active-green-phase' : ''}`}
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
                    <button
                      className="lane-quick-upload-trigger"
                      onClick={() => fileInputRefs.current[laneNumber]?.click()}
                      title="Upload video from PC folder"
                    >
                      📁 {hasVideo ? 'Replace' : 'Upload'}
                    </button>
                    <span className={`lane-state-badge ${badgeClass}`}>{badgeText}</span>
                  </div>
                </div>

                {/* Video Viewport: Clean Upload-Only Placeholder or Active Video */}
                <div
                  className="video-viewport"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                      handleFileSelect(laneNumber, e.dataTransfer.files[0]);
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
                    /* CLEAN EMPTY VIEWPORT PLACEHOLDER */
                    <div
                      className="viewport-empty-placeholder"
                      onClick={() => fileInputRefs.current[laneNumber]?.click()}
                      title="Click or drag a video file from your computer to start detection"
                    >
                      <div className="placeholder-icon-circle">
                        <svg className="icon icon-lg" viewBox="0 0 24 24">
                          <polygon points="23 7 16 12 23 17 23 7" />
                          <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                        </svg>
                      </div>
                      <div className="placeholder-title">No Video Feed Loaded</div>
                      <div className="placeholder-desc">
                        Drag & drop any traffic video from your PC folder or click below to upload.
                      </div>
                      <button className="placeholder-browse-btn" onClick={(e) => {
                        e.stopPropagation();
                        fileInputRefs.current[laneNumber]?.click();
                      }}>
                        📁 Choose Video File from PC
                      </button>
                      <span className="placeholder-hint">Supports MP4, AVI, MOV, MKV, WEBM</span>
                    </div>
                  ) : (
                    /* ACTIVE VIDEO STREAM & DETECTIONS */
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
                          '-- (Awaiting Video Feed)'
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
                      : laneNumber === 1 && (emergencyOverride || lane.is_ambulance_detected)
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
