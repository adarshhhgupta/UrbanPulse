import React, { useState, useEffect, useRef } from 'react';

export default function LiveJunction({ isDedicated = false }) {
  const API_BASE = import.meta.env.VITE_API_URL || '';
  const [lanes, setLanes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [emergencyOverride, setEmergencyOverride] = useState(false);
  const [manualEmergency, setManualEmergency] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const [videoTracks, setVideoTracks] = useState({});
  const [activeDetections, setActiveDetections] = useState({});

  // Dynamic Signal Sequencing
  const [activeLane, setActiveLane] = useState(1); // 1, 2, 3, 4
  const [sequencerMode, setSequencerMode] = useState('adaptive'); // 'adaptive' | 'fixed'
  const [phaseDuration, setPhaseDuration] = useState(8);
  const [secondsRemaining, setSecondsRemaining] = useState(20);
  const [isCycleRunning, setIsCycleRunning] = useState(true);
  const [laneTimings, setLaneTimings] = useState({ 1: 20.0, 2: 25.0, 3: 15.0, 4: 20.0 });

  // Video Feeds State (null initially until uploaded or demo loaded)
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

  const hasAnyActiveVideo = Object.values(customVideoSources).some((src) => src !== null);
  const activeFeedsCount = Object.values(customVideoSources).filter(Boolean).length;

  const hasAnyActiveVideoRef = useRef(false);
  const manualEmergencyRef = useRef(false);
  hasAnyActiveVideoRef.current = hasAnyActiveVideo;
  manualEmergencyRef.current = manualEmergency;

  const [emergencyLane, setEmergencyLane] = useState(1);
  const detectedAmbulanceLane = Number(
    (manualEmergency ? emergencyLane : null) ||
    Object.entries(activeDetections).find(([_, dets]) =>
      Array.isArray(dets) && dets.some((d) => d.vehicle_class === 'ambulance')
    )?.[0] ||
    lanes.find((l) => l.is_ambulance_detected)?.lane_number ||
    (videoTracks && Object.entries(videoTracks).find(([_, t]) => t && t.is_ambulance_detected)?.[0]) ||
    emergencyLane ||
    1
  );

  const isEffectiveEmergency = Boolean(
    emergencyOverride ||
    manualEmergency ||
    // Only use activeDetections (actual model output) — NOT stagedAmbulance checkbox
    Object.values(activeDetections).some((dets) => Array.isArray(dets) && dets.some((d) => d.vehicle_class === 'ambulance')) ||
    lanes.some((l) => l.is_ambulance_detected) ||
    (videoTracks && Object.values(videoTracks).some((t) => t && t.is_ambulance_detected))
  );

  const effectiveGreenLane = isEffectiveEmergency ? detectedAmbulanceLane : activeLane;

  // Fetch telemetry on mount & establish WebSocket stream
  useEffect(() => {
    let ws = null;
    let reconnectTimeout = null;

    const fetchInitialLanes = async () => {
      try {
        setLoading(true);

        fetch(`/videos/detections_data.json?t=${Date.now()}`)
          .then((r) => (r.ok ? r.json() : null))
          .then((data) => {
            if (data) setVideoTracks(data);
          })
          .catch(() => { });

        const res = await fetch(`${API_BASE}/api/lanes`).catch(() => fetch('http://localhost:8001/api/lanes'));
        if (res.ok) {
          const data = await res.json();
          setLanes(data);
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
        const wsUrl = import.meta.env.VITE_WS_URL || `${protocol}//${window.location.host}/ws/lanes`;
        ws = new WebSocket(wsUrl);
        ws.onopen = () => setWsConnected(true);
        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            if (msg.lanes && Array.isArray(msg.lanes)) {
              setLanes(msg.lanes);
            }
            if (msg.active_emergency) {
              if (msg.emergency_lane_id) {
                setEmergencyLane(Number(msg.emergency_lane_id));
              }
              setEmergencyOverride(true);
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

  // Video playback: ensure all active video feeds play continuously when running
  useEffect(() => {
    [1, 2, 3, 4].forEach((laneNum) => {
      const vid = videoRefs.current[laneNum];
      if (!vid) return;

      if (customVideoSources[laneNum] && isCycleRunning) {
        vid.play().catch(() => { });
      } else {
        vid.pause();
      }
    });
  }, [customVideoSources, isCycleRunning]);

  // Automated Signal Countdown Sequencer (active when videos exist)
  useEffect(() => {
    if (emergencyOverride || !isCycleRunning || !hasAnyActiveVideo) return;

    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          setActiveLane((curr) => {
            const next = (curr % 4) + 1;
            const nextDuration = sequencerMode === 'adaptive'
              ? Math.round(laneTimings[next] || laneTimings[String(next)] || 20)
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

  // Single file select for a lane
  const handleFileSelect = (laneNumber, file, manualAmb = false) => {
    if (!file) return;

    const localBlobUrl = URL.createObjectURL(file);
    setCustomVideoSources((prev) => ({ ...prev, [laneNumber]: localBlobUrl }));
    setCustomVideoNames((prev) => ({ ...prev, [laneNumber]: file.name }));

    const isAmb = Boolean(manualAmb || stagedAmbulance[laneNumber]);
    if (isAmb) {
      setStagedAmbulance((prev) => ({ ...prev, [laneNumber]: true }));
    }
    setStagedFiles((prev) => ({ ...prev, [laneNumber]: file }));

    uploadVideoToServer(laneNumber, file, isAmb);
  };

  const uploadVideoToServer = async (laneNumber, file, isAmb) => {
    setUploadingLanes((prev) => ({ ...prev, [laneNumber]: true }));
    setFeedbackMessage(`Analyzing Lane ${laneNumber} video with YOLOv8 neural model...`);
    setFeedbackType('info');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('manual_ambulance', isAmb ? 'true' : 'false');

    try {
      const res = await fetch(`${API_BASE}/api/lanes/${laneNumber}/upload-video`, {
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
      const gSec = data.video_metrics?.allocated_green_seconds ?? 20;

      setFeedbackMessage(
        `Lane ${laneNumber} ingested: YOLOv8 detected ${qCount} vehicles (${dPct}% PCU). Dynamic green: ${gSec} s.`
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

  // Batch upload 1 to 4 videos
  const handleBatchFilesSelected = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setIsBatchProcessing(true);
    setFeedbackMessage(`Ingesting ${files.length} videos from PC folder with YOLOv8...`);
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
      const res = await fetch(`${API_BASE}/api/lanes/upload-all-videos`, {
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

      setFeedbackMessage(`Ingested ${files.length} lane video feeds. Dynamic signal timings arbitrated.`);
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

  // Load sample demo benchmark videos
  const handleLoadSampleDemos = async () => {
    setFeedbackMessage('Loading benchmark demo videos...');
    setFeedbackType('info');

    setCustomVideoSources({
      1: '/videos/lane1.mp4',
      2: '/videos/lane2.mp4',
      3: '/videos/lane3.mp4',
      4: '/videos/lane4.mp4'
    });
    setCustomVideoNames({
      1: 'lane1.mp4',
      2: 'lane2.mp4',
      3: 'lane3.mp4',
      4: 'lane4.mp4'
    });
    setStagedAmbulance({ 1: false, 2: false, 3: false, 4: false });
    setActiveLane(1);
    setEmergencyLane(null);
    setEmergencyOverride(false);
    setSecondsRemaining(20);

    try {
      await fetch(`${API_BASE}/api/lanes/reset-defaults`, { method: 'POST' }).catch(() => { });
      const res = await fetch(`/videos/detections_data.json?t=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        setVideoTracks(data);
      }
      const planRes = await fetch(`${API_BASE}/api/lanes/signal-plan`);
      if (planRes.ok) {
        const plan = await planRes.json();
        if (plan.lane_timings) setLaneTimings(plan.lane_timings);
        if (plan.rule_triggered === 'emergency') {
          setEmergencyOverride(true);
        }
      }
      const lanesRes = await fetch(`${API_BASE}/api/lanes`);
      if (lanesRes.ok) {
        const lData = await lanesRes.json();
        setLanes(lData);
      }
      setFeedbackMessage('Benchmark demo videos loaded with calibrated detections.');
      setFeedbackType('success');
    } catch (e) {
      setFeedbackMessage('Demo benchmark videos loaded.');
    } finally {
      setTimeout(() => setFeedbackMessage(null), 3500);
    }
  };

  // Clear all feeds
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

    try {
      await fetch(`${API_BASE}/api/lanes/clear-all`, { method: 'POST' }).catch(() =>
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

    setFeedbackMessage('All feeds cleared. Standby mode active. Ready for new video uploads.');
    setFeedbackType('success');
    setTimeout(() => setFeedbackMessage(null), 3000);
  };

  const toggleEmergency = (targetLane = null) => {
    const laneToTrigger = targetLane ? Number(targetLane) : detectedAmbulanceLane;
    if (emergencyOverride && (!targetLane || targetLane === detectedAmbulanceLane)) {
      setManualEmergency(false);
      setEmergencyOverride(false);
      const currentDur = sequencerMode === 'adaptive' ? (laneTimings[activeLane] || 20) : phaseDuration;
      setSecondsRemaining(Math.round(currentDur));
      setLanes((prev) => prev.map((l) => ({ ...l, is_ambulance_detected: false })));
      fetch(`${API_BASE}/api/lanes/cancel-ambulance`, { method: 'POST' }).catch(() => { });
      setFeedbackMessage('Emergency override cleared. Standard junction cycle restored.');
      setFeedbackType('info');
    } else {
      setEmergencyLane(laneToTrigger);
      setManualEmergency(true);
      setEmergencyOverride(true);
      setSecondsRemaining(60);
      setActiveLane(laneToTrigger);
      setLaneTimings((prev) => ({ ...prev, [laneToTrigger]: 60.0 }));

      setLanes((prev) =>
        prev.map((l) => ({
          ...l,
          is_ambulance_detected: l.lane_number === laneToTrigger,
          current_state: l.lane_number === laneToTrigger ? 'green' : 'red'
        }))
      );

      if (!customVideoSources[laneToTrigger]) {
        setCustomVideoSources((prev) => ({ ...prev, [laneToTrigger]: '/videos/ambulancevid.mp4' }));
        setCustomVideoNames((prev) => ({ ...prev, [laneToTrigger]: `emergency_ambulance_lane${laneToTrigger}.mp4` }));
      }
      setStagedAmbulance({ 1: false, 2: false, 3: false, 4: false, [laneToTrigger]: true });

      fetch(`${API_BASE}/api/lanes/${laneToTrigger}/trigger-ambulance`, { method: 'POST' })
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data && data.decision && data.decision.lane_timings) {
            setLaneTimings(data.decision.lane_timings);
          }
        })
        .catch(() => { });

      setFeedbackMessage(
        `Emergency override engaged. Ambulance detected in Lane ${laneToTrigger} (${laneDirections[laneToTrigger]}). Next node Junction 7 pre-empted.`
      );
      setFeedbackType('success');
    }
  };

  const selectLane = (laneNum) => {
    setEmergencyOverride(false);
    setManualEmergency(false);
    setActiveLane(laneNum);
    const dur = sequencerMode === 'adaptive' ? (laneTimings[laneNum] || 20) : phaseDuration;
    setSecondsRemaining(Math.round(dur));
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

  // Junction Plan calculations
  const order = [1, 2, 3, 4];
  const totalCycle = order.reduce((acc, n) => {
    const d = sequencerMode === 'adaptive' ? (laneTimings[n] || 20) : phaseDuration;
    return acc + Math.round(d);
  }, 0);

  let accumulated = 0;
  const slotData = order.map((n) => {
    const d = sequencerMode === 'adaptive' ? (laneTimings[n] || 20) : phaseDuration;
    const roundedD = Math.round(d);
    const start = accumulated;
    accumulated += roundedD;
    return {
      n,
      duration: roundedD,
      leftPct: totalCycle > 0 ? (start / totalCycle) * 100 : 0,
      widthPct: totalCycle > 0 ? (roundedD / totalCycle) * 100 : 0
    };
  });

  const getSigClass = (n) => {
    if (!hasAnyActiveVideo) return '';
    return n === effectiveGreenLane ? 'g' : 'r';
  };

  return (
    <section id="live" style={{ paddingTop: isDedicated ? 0 : 12 }}>
      {!isDedicated && (
        <div className="sh">
          <div className="kick">Edge perception studio and demand-responsive signal control</div>
          <h2>Live 4-lane junction</h2>
          <p>
            Upload traffic videos into each lane or ingest all four at once. YOLOv8 detects objects in real time, computes PCU road density and arbitrates green signal timings.
          </p>
        </div>
      )}

      {/* Hidden batch file input */}
      <input
        ref={batchFileInputRef}
        type="file"
        id="batch"
        accept="video/*,.mp4,.avi,.mov,.mkv,.webm"
        multiple
        hidden
        onChange={handleBatchFilesSelected}
      />

      {feedbackMessage && (
        <div className={`upload-feedback-banner ${feedbackType === 'error' ? 'feedback-error' : 'feedback-success'}`}>
          <span>{feedbackMessage}</span>
          <button className="remove-file-btn" onClick={() => setFeedbackMessage(null)} aria-label="Dismiss feedback">✕</button>
        </div>
      )}

      {/* Toolbar */}
      <div className="card bar">
        <div className="grp">
          <span className={`feeds ${hasAnyActiveVideo ? 'live' : ''}`}>
            <i></i>
            <span>
              {hasAnyActiveVideo
                ? `${activeFeedsCount}/4 feeds streaming`
                : '0/4 feeds, ready for PC uploads'}
            </span>
          </span>
          <button
            className="btn pri"
            id="bBatch"
            disabled={isBatchProcessing}
            onClick={() => batchFileInputRef.current?.click()}
            type="button"
          >
            {isBatchProcessing ? 'Analyzing videos...' : 'Batch upload (1 to 4 videos)'}
          </button>
          <button
            className="btn"
            id="bDemo"
            onClick={handleLoadSampleDemos}
            type="button"
          >
            Load benchmark demo
          </button>
          <button
            className="btn"
            id="bClear"
            onClick={handleClearAllFeeds}
            type="button"
          >
            Clear feeds
          </button>
        </div>

        <div className="grp">
          <span className="seg">
            <button
              className={`btn ${sequencerMode === 'adaptive' ? 'on' : ''}`}
              data-mode="adaptive"
              onClick={() => {
                setSequencerMode('adaptive');
                const nextDur = laneTimings[activeLane] || 20;
                setSecondsRemaining(Math.round(nextDur));
              }}
              type="button"
            >
              Dynamic (YOLO)
            </button>
            <button
              className={`btn ${sequencerMode === 'fixed' ? 'on' : ''}`}
              data-mode="fixed"
              onClick={() => {
                setSequencerMode('fixed');
                setSecondsRemaining(phaseDuration);
              }}
              type="button"
            >
              Fixed
            </button>
          </span>

          {sequencerMode === 'fixed' && (
            <span className="seg" title="Fixed cycle duration">
              {[5, 8, 10].map((sec) => (
                <button
                  key={sec}
                  className={`btn ${phaseDuration === sec ? 'on' : ''}`}
                  onClick={() => {
                    setPhaseDuration(sec);
                    setSecondsRemaining(sec);
                  }}
                  type="button"
                >
                  {sec}s
                </button>
              ))}
            </span>
          )}

          <button
            className="btn"
            id="bRun"
            onClick={() => setIsCycleRunning(!isCycleRunning)}
            type="button"
          >
            {isCycleRunning ? 'Pause' : 'Resume'}
          </button>

          <span className="grp" style={{ gap: 0 }}>
            <span className="lbl">Force green</span>
            <span className="seg" id="force">
              {[1, 2, 3, 4].map((n) => (
                <button
                  key={n}
                  className={`btn ${hasAnyActiveVideo && effectiveGreenLane === n ? 'on' : ''}`}
                  onClick={() => selectLane(n)}
                  type="button"
                >
                  L{n}
                </button>
              ))}
            </span>
          </span>

          <button
            className={`btn ${emergencyOverride ? 'emg' : ''}`}
            id="bEmg"
            onClick={() => toggleEmergency(detectedAmbulanceLane)}
            type="button"
          >
            {emergencyOverride ? 'Cancel emergency' : 'Trigger ambulance'}
          </button>
        </div>
      </div>

      {/* Emergency Banner */}
      <div className={`banner ${isEffectiveEmergency && hasAnyActiveVideo ? 'show' : ''}`} id="banner">
        <div>
          <h3 id="bt">Emergency override engaged. Ambulance detected in Lane {detectedAmbulanceLane}.</h3>
          <p id="bp">
            Corridor clearing: opposing lanes are locked to red. Lane {detectedAmbulanceLane} ({laneDirections[detectedAmbulanceLane]}) green corridor is active. The next downstream node, Junction 7, was pre-empted over MQTT.
          </p>
        </div>
        <div className="m">
          Priority <b>tier 1</b> · Override phase <b className="num" id="bs">{secondsRemaining} s</b>
        </div>
      </div>

      {/* Junction Plan Card */}
      <div className="card plan" id="plan">
        <div className="map">
          <div className="rv"></div>
          <div className="rh"></div>
          <div className="core num">{hasAnyActiveVideo ? secondsRemaining : '–'}</div>

          {/* Lane 1 bottom (s), Lane 2 left (w), Lane 3 top (n), Lane 4 right (e) */}
          <span className={`sig s ${getSigClass(1)}`}>1</span>
          <span className={`sig w ${getSigClass(2)}`}>2</span>
          <span className={`sig n ${getSigClass(3)}`}>3</span>
          <span className={`sig e ${getSigClass(4)}`}>4</span>

          <span className="dir n">Southbound</span>
          <span className="dir s">Northbound</span>
          <span className="dir w">Eastbound</span>
          <span className="dir e">Westbound</span>
        </div>

        <div>
          <div className="ph">
            <strong>
              {hasAnyActiveVideo
                ? `Lane ${effectiveGreenLane} (${laneDirections[effectiveGreenLane]}) has green.`
                : 'No feeds loaded. Load four videos or the benchmark demo to start the cycle.'}
            </strong>
            <span className="num">
              {hasAnyActiveVideo
                ? (emergencyOverride ? 'Emergency override' : `Cycle ${totalCycle} s`)
                : 'Cycle –'}
            </span>
          </div>

          {slotData.map(({ n, duration, leftPct, widthPct }) => {
            const isG = hasAnyActiveVideo && effectiveGreenLane === n;
            const isR = hasAnyActiveVideo && !isG;
            const prClass = !hasAnyActiveVideo ? '' : isG ? 'g' : 'r';

            return (
              <div key={n} className={`pr ${prClass}`}>
                <span className="nm">
                  <i></i>Lane {n}
                </span>
                <span className="trk">
                  {hasAnyActiveVideo && (
                    <span
                      className="slot"
                      style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                    />
                  )}
                </span>
                <span className="s num">
                  {hasAnyActiveVideo ? `${duration} s` : '–'}
                </span>
              </div>
            );
          })}

          <div className="foot">
            {sequencerMode === 'adaptive'
              ? 'Green slots follow the detected queue and are served in lane order 1, 2, 3, 4.'
              : `Fixed mode: each approach receives ${phaseDuration} s, served in lane order 1, 2, 3, 4.`}
          </div>
        </div>
      </div>

      {/* 2x2 Lanes Grid */}
      <div className="lanes" id="lanes">
        {order.map((laneNumber) => {
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

          const isGreen = hasVideo && (laneNumber === effectiveGreenLane);
          const isRed = hasVideo && !isGreen;
          const isThisLaneEmergency = (isEffectiveEmergency && laneNumber === detectedAmbulanceLane) ||
            stagedAmbulance[laneNumber] ||
            (activeDetections[laneNumber] && activeDetections[laneNumber].some((d) => d.vehicle_class === 'ambulance')) ||
            Boolean(lane.is_ambulance_detected);

          const laneTracked = activeDetections[laneNumber];
          const currentDetections = hasVideo ? (laneTracked || lane.detections || []) : [];

          const vehicleCount = hasVideo
            ? (currentDetections.filter((d) => d.vehicle_class !== 'pedestrian' && d.vehicle_class !== 'person').length || lane.queue_count || 0)
            : 0;

          const allocatedGreen = isThisLaneEmergency
            ? 60.0
            : (laneTimings[laneNumber] || laneTimings[String(laneNumber)] || Math.max(15, Math.min(90, Math.round(15 + 1.2 * vehicleCount))));

          // Passenger Car Unit (PCU) calculation directly from active YOLO detections
          const PCU_WEIGHTS = {
            car: 1.0,
            truck: 3.0,
            bus: 2.5,
            bike: 0.5,
            motorcycle: 0.5,
            'auto-rickshaw': 0.8,
            auto: 0.8,
            ambulance: 1.2
          };
          const livePcu = currentDetections.reduce((sum, d) => {
            const v = (d.vehicle_class || '').toLowerCase();
            if (v === 'pedestrian' || v === 'person') return sum;
            return sum + (PCU_WEIGHTS[v] || 1.0);
          }, 0);

          const computedDensity = livePcu > 0
            ? Math.min(100, Math.round((livePcu / 28.0) * 100))
            : (lane.density_percent && Number(lane.density_percent) > 0
                ? Math.round(Number(lane.density_percent))
                : Math.min(100, Math.round(vehicleCount * 5.2)));

          const densityPercent = hasVideo ? computedDensity : 0;

          let badgeText = 'Awaiting video feed';
          let badgeClass = 'badge';

          if (hasVideo) {
            if (isEffectiveEmergency) {
              if (laneNumber === detectedAmbulanceLane) {
                badgeText = `Ambulance override, green (${secondsRemaining}s)`;
                badgeClass = 'badge g';
              } else {
                badgeText = 'Emergency hold, red (paused)';
                badgeClass = 'badge r';
              }
            } else {
              if (isGreen) {
                badgeText = `Green, ${secondsRemaining}s remaining`;
                badgeClass = 'badge g';
              } else {
                badgeText = 'Holding red, waiting';
                badgeClass = 'badge r';
              }
            }
          }

          return (
            <div
              key={laneNumber}
              className={`card lane ${isGreen ? 'g' : ''} ${isRed ? 'r' : ''} ${isThisLaneEmergency ? 'e' : ''}`}
              id={`lane${laneNumber}`}
            >
              {/* Lane Header */}
              <div className="lh">
                <b>
                  <i></i>Lane {laneNumber} ({laneDirections[laneNumber]})
                </b>
                <span className="grp" style={{ gap: 6 }}>
                  {hasVideo && (
                    <>
                      <button
                        className="btn mini"
                        onClick={() => fileInputRefs.current[laneNumber]?.click()}
                        type="button"
                      >
                        Replace
                      </button>
                      <button
                        className="btn mini"
                        onClick={() => {
                          setCustomVideoSources((prev) => ({ ...prev, [laneNumber]: null }));
                          setCustomVideoNames((prev) => ({ ...prev, [laneNumber]: null }));
                          setStagedFiles((prev) => ({ ...prev, [laneNumber]: null }));
                          setStagedAmbulance((prev) => ({ ...prev, [laneNumber]: false }));
                          if (fileInputRefs.current[laneNumber]) fileInputRefs.current[laneNumber].value = '';
                        }}
                        type="button"
                        aria-label={`Remove feed from Lane ${laneNumber}`}
                      >
                        ✕
                      </button>
                    </>
                  )}
                  <span className={badgeClass}>{badgeText}</span>
                </span>
              </div>

              {/* Hidden File Input */}
              <input
                ref={(el) => (fileInputRefs.current[laneNumber] = el)}
                type="file"
                id={`f${laneNumber}`}
                accept="video/*,.mp4,.avi,.mov,.mkv,.webm"
                hidden
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileSelect(laneNumber, e.target.files[0], stagedAmbulance[laneNumber]);
                  }
                }}
              />

              {/* Viewport 16:9 */}
              <div
                className="vp"
                id={`vp${laneNumber}`}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    handleFileSelect(laneNumber, e.dataTransfer.files[0], stagedAmbulance[laneNumber]);
                  }
                }}
              >
                {!hasVideo ? (
                  <div
                    className="ph0"
                    onClick={() => fileInputRefs.current[laneNumber]?.click()}
                  >
                    <div className="ic">
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <rect x="2" y="6" width="14" height="12" rx="2" />
                        <path d="m22 8-6 4 6 4z" />
                      </svg>
                    </div>
                    <h4>Lane {laneNumber} feed standby</h4>
                    <p>Drag and drop a traffic video from your PC, or click to browse.</p>
                    <button
                      className="btn"
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        fileInputRefs.current[laneNumber]?.click();
                      }}
                    >
                      Choose video file
                    </button>
                    <label onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={stagedAmbulance[laneNumber] || false}
                        onChange={(e) =>
                          setStagedAmbulance((prev) => ({ ...prev, [laneNumber]: e.target.checked }))
                        }
                      />
                      Video contains an emergency vehicle
                    </label>
                    <small>MP4, AVI, MOV, MKV or WEBM</small>
                  </div>
                ) : (
                  <>
                    <video
                      ref={(el) => {
                        if (el) {
                          videoRefs.current[laneNumber] = el;
                          if (isCycleRunning) {
                            el.play().catch(() => { });
                          }
                        }
                      }}
                      src={videoSrc}
                      autoPlay
                      loop
                      muted
                      playsInline
                      onTimeUpdate={(e) => handleTimeUpdate(laneNumber, e)}
                    />

                    {/* HUD Top-Left */}
                    <div className="hud num">
                      CAM-0{laneNumber} · {customName || `lane${laneNumber}.mp4`}
                    </div>

                    {/* Pill Bottom-Left */}
                    <div className={`pill ${isGreen ? 'g' : 'r'}`}>
                      {isGreen
                        ? `Green flow, ${secondsRemaining}s of ${Math.round(allocatedGreen)}s`
                        : `Red, holding (${Math.round(allocatedGreen)}s allocated)`}
                    </div>

                    {/* YOLO Bounding Boxes */}
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
                          {d.vehicle_class} {d.confidence_score ? d.confidence_score.toFixed(2) : '0.98'}
                        </span>
                      </div>
                    ))}
                  </>
                )}
              </div>

              {/* Telemetry Row */}
              <div className="tel">
                <div className="head">
                  <b className={`r ${isRed ? 'on' : ''}`}></b>
                  <b className={`y ${!hasVideo ? 'on' : ''}`}></b>
                  <b className={`g ${isGreen ? 'on' : ''}`}></b>
                </div>

                <div className="mg">
                  <div className="ml">
                    <span>Detected queue</span>
                    <span className="num">
                      {hasVideo ? `${vehicleCount} vehicles` : '-- (Standby)'}
                    </span>
                  </div>

                  <div className="ml">
                    <span>PCU density index</span>
                    <span className="num">
                      {hasVideo
                        ? `${densityPercent}% (${isGreen ? 'active discharge' : densityPercent > 70 ? 'high congestion' : 'normal queue'})`
                        : '0.0% (Standby)'}
                    </span>
                  </div>

                  <div className="bt">
                    <div style={{ width: `${hasVideo ? densityPercent : 0}%` }}></div>
                  </div>
                </div>
              </div>

              {/* Footer Row */}
              <div className="lf">
                <span>
                  Signal <b className="num">{!hasVideo ? 'offline (standby)' : isGreen ? 'green (flowing)' : 'red (waiting)'}</b>
                </span>
                <span className="num">
                  {!hasVideo
                    ? 'No feed'
                    : isThisLaneEmergency
                      ? 'Emergency override (60 s)'
                      : `Dynamic green ${Math.round(allocatedGreen)} s`}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
