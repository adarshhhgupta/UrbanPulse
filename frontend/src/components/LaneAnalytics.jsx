import React, { useState } from 'react';

// Reusable SVG Donut Chart Component
function DonutChart({ items, size = 180, strokeWidth = 22, centerValue, centerLabel }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  // Filter out items with 0 count
  const validItems = items.filter(item => item.count > 0);
  const total = validItems.reduce((acc, item) => acc + item.count, 0);

  let accumulatedPercent = 0;

  return (
    <div className="donut-chart-wrapper" style={{ width: size, height: size, position: 'relative' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Background Circle */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="rgba(255, 255, 255, 0.05)"
          strokeWidth={strokeWidth}
        />

        {/* Donut Slices */}
        {validItems.map((item, idx) => {
          const slicePercent = total > 0 ? item.count / total : 0;
          const strokeDasharray = `${slicePercent * circumference} ${circumference}`;
          const strokeDashoffset = -accumulatedPercent * circumference;
          accumulatedPercent += slicePercent;

          return (
            <circle
              key={idx}
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke={item.color}
              strokeWidth={strokeWidth}
              strokeDasharray={strokeDasharray}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              transform={`rotate(-90 ${center} ${center})`}
              style={{
                transition: 'all 0.5s ease-out',
                cursor: 'pointer',
                filter: `drop-shadow(0 0 4px ${item.color}66)`
              }}
            >
              <title>{`${item.name}: ${item.count} (${(slicePercent * 100).toFixed(1)}%)`}</title>
            </circle>
          );
        })}
      </svg>

      {/* Center Label */}
      <div className="donut-center-content">
        <div className="donut-center-val">{centerValue ?? total}</div>
        <div className="donut-center-lbl">{centerLabel || 'DETECTED'}</div>
      </div>
    </div>
  );
}

export default function LaneAnalytics() {
  const [selectedView, setSelectedView] = useState('all'); // 'all' | 1 | 2 | 3 | 4

  // Calibrated real video detection counts per lane
  const laneVehicleData = {
    1: {
      id: 1,
      name: 'Lane 1 (Northbound)',
      direction: 'Northbound',
      subtitle: 'Emergency Priority Corridor & Fast Transit',
      totalVehicles: 8,
      totalTracked: 110,
      pcuLoad: 8.2,
      dominantClass: 'Car (87.5%)',
      statusNote: '🚨 Type-C Ambulance Active',
      statusClass: 'text-critical',
      classes: [
        { name: 'Car', key: 'car', count: 7, pct: 87.5, color: '#3b82f6', pcu: 1.0 },
        { name: 'Ambulance', key: 'ambulance', count: 1, pct: 12.5, color: '#f43f5e', pcu: 1.2 },
        { name: 'Auto-Rickshaw', key: 'auto', count: 0, pct: 0, color: '#f59e0b', pcu: 0.8 },
        { name: 'Bike', key: 'bike', count: 0, pct: 0, color: '#06b6d4', pcu: 0.5 },
        { name: 'Bus', key: 'bus', count: 0, pct: 0, color: '#8b5cf6', pcu: 2.5 },
        { name: 'Truck', key: 'truck', count: 0, pct: 0, color: '#f97316', pcu: 3.0 },
        { name: 'Pedestrian', key: 'pedestrian', count: 0, pct: 0, color: '#10b981', pcu: 0.0 }
      ]
    },
    2: {
      id: 2,
      name: 'Lane 2 (Eastbound)',
      direction: 'Eastbound',
      subtitle: 'Saturated Arterial Bottleneck & Dense Fleet',
      totalVehicles: 27,
      totalTracked: 1168,
      pcuLoad: 22.0,
      dominantClass: 'Car (44.4%) & Auto (37.0%)',
      statusNote: '⚠️ High Density Bottleneck',
      statusClass: 'text-yellow',
      classes: [
        { name: 'Car', key: 'car', count: 12, pct: 44.4, color: '#3b82f6', pcu: 1.0 },
        { name: 'Auto-Rickshaw', key: 'auto', count: 10, pct: 37.0, color: '#f59e0b', pcu: 0.8 },
        { name: 'Pedestrian', key: 'pedestrian', count: 3, pct: 11.1, color: '#10b981', pcu: 0.0 },
        { name: 'Bike', key: 'bike', count: 2, pct: 7.4, color: '#06b6d4', pcu: 0.5 },
        { name: 'Bus', key: 'bus', count: 0, pct: 0, color: '#8b5cf6', pcu: 2.5 },
        { name: 'Truck', key: 'truck', count: 0, pct: 0, color: '#f97316', pcu: 3.0 },
        { name: 'Ambulance', key: 'ambulance', count: 0, pct: 0, color: '#f43f5e', pcu: 1.2 }
      ]
    },
    3: {
      id: 3,
      name: 'Lane 3 (Southbound)',
      direction: 'Southbound',
      subtitle: 'Flyover Descent, Public Transit & Pedestrians',
      totalVehicles: 19,
      totalTracked: 767,
      pcuLoad: 17.0,
      dominantClass: 'Pedestrian (42.1%) & Car (36.8%)',
      statusNote: '🟢 Free Flow Transit Corridor',
      statusClass: 'text-green',
      classes: [
        { name: 'Pedestrian', key: 'pedestrian', count: 8, pct: 42.1, color: '#10b981', pcu: 0.0 },
        { name: 'Car', key: 'car', count: 7, pct: 36.8, color: '#3b82f6', pcu: 1.0 },
        { name: 'Bus', key: 'bus', count: 4, pct: 21.1, color: '#8b5cf6', pcu: 2.5 },
        { name: 'Bike', key: 'bike', count: 0, pct: 0, color: '#06b6d4', pcu: 0.5 },
        { name: 'Auto-Rickshaw', key: 'auto', count: 0, pct: 0, color: '#f59e0b', pcu: 0.8 },
        { name: 'Truck', key: 'truck', count: 0, pct: 0, color: '#f97316', pcu: 3.0 },
        { name: 'Ambulance', key: 'ambulance', count: 0, pct: 0, color: '#f43f5e', pcu: 1.2 }
      ]
    },
    4: {
      id: 4,
      name: 'Lane 4 (Westbound)',
      direction: 'Westbound',
      subtitle: 'Approaching Surge Bottleneck & Mixed Fleet',
      totalVehicles: 21,
      totalTracked: 617,
      pcuLoad: 13.4,
      dominantClass: 'Balanced (Auto / Car / Pedestrian)',
      statusNote: '🔥 Surge Spike Warning (+23%)',
      statusClass: 'text-yellow',
      classes: [
        { name: 'Auto-Rickshaw', key: 'auto', count: 7, pct: 33.3, color: '#f59e0b', pcu: 0.8 },
        { name: 'Car', key: 'car', count: 7, pct: 33.3, color: '#3b82f6', pcu: 1.0 },
        { name: 'Pedestrian', key: 'pedestrian', count: 7, pct: 33.3, color: '#10b981', pcu: 0.0 },
        { name: 'Bike', key: 'bike', count: 0, pct: 0, color: '#06b6d4', pcu: 0.5 },
        { name: 'Bus', key: 'bus', count: 0, pct: 0, color: '#8b5cf6', pcu: 2.5 },
        { name: 'Truck', key: 'truck', count: 0, pct: 0, color: '#f97316', pcu: 3.0 },
        { name: 'Ambulance', key: 'ambulance', count: 0, pct: 0, color: '#f43f5e', pcu: 1.2 }
      ]
    }
  };

  // Intersection Aggregate Totals
  const totalJunctionDetections = 8 + 27 + 19 + 21; // 75
  const aggregateClasses = [
    { name: 'Car', count: 33, pct: 44.0, color: '#3b82f6' },
    { name: 'Pedestrian', count: 18, pct: 24.0, color: '#10b981' },
    { name: 'Auto-Rickshaw', count: 17, pct: 22.7, color: '#f59e0b' },
    { name: 'Bus', count: 4, pct: 5.3, color: '#8b5cf6' },
    { name: 'Bike', count: 2, pct: 2.7, color: '#06b6d4' },
    { name: 'Ambulance', count: 1, pct: 1.3, color: '#f43f5e' }
  ];

  const currentLaneData = typeof selectedView === 'number' ? laneVehicleData[selectedView] : null;

  return (
    <section id="lane-analytics">
      <div className="section-header">
        <div className="section-tag">Spatial Perception & Multi-Class Distribution</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 className="section-title">
              <svg className="icon text-green" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 2a10 10 0 0 1 10 10" />
                <circle cx="12" cy="12" r="4" />
              </svg>
              Lane Vehicle Analytics & Donut Graphs
            </h2>
            <p className="section-desc">
              Visual composition analysis and multi-class detection distribution (Cars, Auto-Rickshaws, Bikes, Buses, Trucks, Ambulances, and Pedestrians) across each quad-camera approach.
            </p>
          </div>

          {/* Interactive Navigation Filter */}
          <div className="cycle-toolbar">
            <button
              className={`sim-btn ${selectedView === 'all' ? 'sim-btn-active' : ''}`}
              onClick={() => setSelectedView('all')}
              style={{
                backgroundColor: selectedView === 'all' ? 'rgba(59, 130, 246, 0.2)' : undefined,
                borderColor: selectedView === 'all' ? 'var(--accent-blue)' : undefined,
                color: selectedView === 'all' ? '#ffffff' : undefined
              }}
            >
              <svg className="icon icon-sm" viewBox="0 0 24 24">
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
              </svg>
              All 4 Lanes
            </button>

            {[1, 2, 3, 4].map(num => (
              <button
                key={num}
                className={`sim-btn ${selectedView === num ? 'sim-btn-active' : ''}`}
                style={{
                  backgroundColor: selectedView === num ? 'rgba(34, 197, 94, 0.2)' : undefined,
                  borderColor: selectedView === num ? 'var(--signal-green)' : undefined,
                  color: selectedView === num ? '#ffffff' : undefined
                }}
                onClick={() => setSelectedView(num)}
              >
                Lane {num}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Intersection-Wide Aggregate KPI Banner */}
      <div className="kpi-summary-grid">
        <div className="kpi-summary-card">
          <span className="kpi-summary-label">Total Detected Objects</span>
          <span className="kpi-summary-val text-green">{totalJunctionDetections}</span>
          <span className="kpi-summary-sub">Active in intersection frame</span>
        </div>
        <div className="kpi-summary-card">
          <span className="kpi-summary-label">Motorized Vehicles</span>
          <span className="kpi-summary-val" style={{ color: '#60a5fa' }}>57</span>
          <span className="kpi-summary-sub">33 Cars • 17 Autos • 4 Buses • 2 Bikes • 1 Amb</span>
        </div>
        <div className="kpi-summary-card">
          <span className="kpi-summary-label">Pedestrians (VRUs)</span>
          <span className="kpi-summary-val" style={{ color: '#10b981' }}>18</span>
          <span className="kpi-summary-sub">Lane 3 (8) • Lane 4 (7) • Lane 2 (3)</span>
        </div>
        <div className="kpi-summary-card">
          <span className="kpi-summary-label">Emergency Priority</span>
          <span className="kpi-summary-val text-critical">1</span>
          <span className="kpi-summary-sub">Lane 1 (Northbound) Corridor</span>
        </div>
      </div>

      {/* VIEW A: ALL 4 LANES QUAD-GRID (Donut Graph for Each Lane) */}
      {selectedView === 'all' && (
        <div className="lanes-donut-grid">
          {[1, 2, 3, 4].map((laneNum) => {
            const lane = laneVehicleData[laneNum];
            const validClasses = lane.classes.filter(c => c.count > 0);

            return (
              <div key={lane.id} className="lane-donut-card">
                <div className="lane-donut-header">
                  <div>
                    <span className="lane-donut-title">{lane.name}</span>
                    <div className="lane-donut-sub font-mono">{lane.subtitle}</div>
                  </div>
                  <span className={`font-mono ${lane.statusClass}`} style={{ fontSize: '0.72rem', fontWeight: 700 }}>
                    {lane.statusNote}
                  </span>
                </div>

                <div className="lane-donut-body">
                  {/* SVG Donut Chart */}
                  <DonutChart
                    items={lane.classes}
                    size={170}
                    strokeWidth={20}
                    centerValue={lane.totalVehicles}
                    centerLabel="OBJECTS"
                  />

                  {/* Vehicle Breakdown Legend Badges */}
                  <div className="donut-legend-stack">
                    <div className="legend-section-title font-mono">DETECTED VEHICLES & PEDESTRIANS:</div>
                    {validClasses.map((item) => (
                      <div key={item.key} className="donut-legend-item">
                        <span className="legend-badge-pill" style={{ backgroundColor: `${item.color}22`, borderColor: item.color, color: item.color }}>
                          <span className="legend-color-dot" style={{ backgroundColor: item.color }} />
                          <strong>{item.name}</strong>
                        </span>
                        <span className="font-mono" style={{ fontSize: '0.8rem', color: '#f1f5f9' }}>
                          <strong>{item.count}</strong> <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>({item.pct}%)</span>
                        </span>
                      </div>
                    ))}

                    <div className="lane-pcu-meter">
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        <span>PCU Capacity Occupancy:</span>
                        <span className="font-mono text-yellow">{lane.pcuLoad} / 28.0 PCU</span>
                      </div>
                      <div className="density-bar-bg" style={{ height: 6 }}>
                        <div
                          className="density-bar-fill"
                          style={{
                            width: `${Math.min(100, (lane.pcuLoad / 28.0) * 100)}%`,
                            backgroundColor: lane.pcuLoad > 20 ? 'var(--signal-red)' : lane.pcuLoad > 10 ? 'var(--signal-yellow)' : 'var(--signal-green)'
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="lane-donut-footer">
                  <span className="font-mono text-dim" style={{ fontSize: '0.72rem' }}>
                    Dominant: <strong style={{ color: '#fff' }}>{lane.dominantClass}</strong>
                  </span>
                  <button
                    className="sim-btn"
                    style={{ padding: '0.2rem 0.6rem', fontSize: '0.72rem' }}
                    onClick={() => setSelectedView(laneNum)}
                  >
                    Deep Dive &rarr;
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* VIEW B: SINGLE LANE DEEP DIVE WITH EXPANDED CHARTS */}
      {currentLaneData && (
        <div className="lane-deep-dive-panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', margin: 0 }}>
                  {currentLaneData.name} — Detailed Vehicle Perception Breakdown
                </h3>
                <span className={`font-mono ${currentLaneData.statusClass}`} style={{ fontSize: '0.8rem', fontWeight: 700 }}>
                  {currentLaneData.statusNote}
                </span>
              </div>
              <p className="font-mono text-dim" style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem' }}>
                {currentLaneData.subtitle}
              </p>
            </div>
            <button className="sim-btn" onClick={() => setSelectedView('all')} style={{ padding: '0.35rem 0.75rem' }}>
              &larr; Back to All 4 Lanes
            </button>
          </div>

          <div className="deep-dive-grid">
            {/* Left: Expanded Donut Chart */}
            <div className="deep-dive-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1.75rem' }}>
              <span className="font-mono text-muted" style={{ fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '1rem', letterSpacing: '0.05em' }}>
                Modal Distribution Donut Chart
              </span>
              <DonutChart
                items={currentLaneData.classes}
                size={220}
                strokeWidth={28}
                centerValue={currentLaneData.totalVehicles}
                centerLabel="VEHICLES & VRU"
              />
              <div style={{ marginTop: '1.5rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'center' }}>
                {currentLaneData.classes.filter(c => c.count > 0).map(item => (
                  <span
                    key={item.key}
                    className="legend-badge-pill font-mono"
                    style={{ backgroundColor: `${item.color}20`, borderColor: item.color, color: item.color, fontSize: '0.75rem', padding: '0.25rem 0.55rem' }}
                  >
                    <span className="legend-color-dot" style={{ backgroundColor: item.color }} />
                    {item.name}: <strong>{item.count}</strong> ({item.pct}%)
                  </span>
                ))}
              </div>
            </div>

            {/* Right: Vehicle Class Volume Bar Chart */}
            <div className="deep-dive-card" style={{ padding: '1.5rem' }}>
              <span className="font-mono text-muted" style={{ fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '1rem', display: 'block', letterSpacing: '0.05em' }}>
                Categorical Vehicle Detection Histogram
              </span>

              <div className="vehicle-bars-container">
                {currentLaneData.classes.map(item => {
                  const maxCount = Math.max(...currentLaneData.classes.map(c => c.count), 1);
                  const barPercent = (item.count / maxCount) * 100;

                  return (
                    <div key={item.key} className="vehicle-bar-row">
                      <div className="vehicle-bar-meta">
                        <span style={{ color: item.count > 0 ? '#fff' : 'var(--text-dim)', fontWeight: item.count > 0 ? 600 : 400, minWidth: '110px' }}>
                          {item.name}
                        </span>
                        <span className="font-mono" style={{ color: item.color, fontWeight: 700, fontSize: '0.85rem' }}>
                          {item.count} units
                        </span>
                        <span className="font-mono text-dim" style={{ fontSize: '0.72rem' }}>
                          ({item.pct}%)
                        </span>
                      </div>
                      <div className="vehicle-bar-track">
                        <div
                          className="vehicle-bar-fill"
                          style={{
                            width: `${barPercent}%`,
                            backgroundColor: item.color,
                            boxShadow: item.count > 0 ? `0 0 8px ${item.color}88` : 'none'
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* PCU Formula Reference */}
              <div className="pcu-calc-banner font-mono">
                <span>PCU Occupancy = &Sigma; (Count &times; Weight) = <strong>{currentLaneData.pcuLoad} PCU</strong></span>
                <span className="text-muted">Max Capacity: 28.0 PCU ({((currentLaneData.pcuLoad / 28.0) * 100).toFixed(1)}% Load)</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cross-Lane Comparative Volume Chart */}
      <div className="panel" style={{ marginTop: '1.5rem' }}>
        <div className="panel-header">
          <span className="panel-title">Cross-Lane Comparative Traffic Composition & PCU Allocation</span>
          <span className="font-mono text-dim" style={{ fontSize: '0.75rem' }}>Quad-Channel Volume Comparison</span>
        </div>
        <div className="panel-body">
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Lane Approach</th>
                  <th>Total Detected</th>
                  <th>Cars</th>
                  <th>Auto-Rickshaws</th>
                  <th>Bikes</th>
                  <th>Buses</th>
                  <th>Ambulances</th>
                  <th>Pedestrians</th>
                  <th>PCU Load</th>
                </tr>
              </thead>
              <tbody>
                {[1, 2, 3, 4].map(num => {
                  const l = laneVehicleData[num];
                  const getCnt = (k) => l.classes.find(c => c.key === k)?.count || 0;

                  return (
                    <tr key={num} className={selectedView === num ? 'highlight-row' : ''}>
                      <td>
                        <strong style={{ color: '#fff' }}>{l.name}</strong>
                        <div className="font-mono text-dim" style={{ fontSize: '0.7rem' }}>{l.direction}</div>
                      </td>
                      <td>
                        <span className="font-mono" style={{ fontWeight: 800, fontSize: '0.95rem', color: '#60a5fa' }}>
                          {l.totalVehicles}
                        </span>
                      </td>
                      <td className="font-mono">{getCnt('car') || '-'}</td>
                      <td className="font-mono">{getCnt('auto') || '-'}</td>
                      <td className="font-mono">{getCnt('bike') || '-'}</td>
                      <td className="font-mono">{getCnt('bus') || '-'}</td>
                      <td className="font-mono">
                        {getCnt('ambulance') > 0 ? (
                          <span className="badge-heavy font-mono">1 (Active)</span>
                        ) : '-'}
                      </td>
                      <td className="font-mono">
                        {getCnt('pedestrian') > 0 ? (
                          <span className="text-green" style={{ fontWeight: 700 }}>{getCnt('pedestrian')}</span>
                        ) : '-'}
                      </td>
                      <td>
                        <span className="font-mono text-yellow" style={{ fontWeight: 700 }}>
                          {l.pcuLoad} PCU
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
