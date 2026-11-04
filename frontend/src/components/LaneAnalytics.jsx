import React, { useState, useEffect } from 'react';

function DonutChart({ items, size = 160, strokeWidth = 20, centerValue, centerLabel }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  const validItems = items.filter((item) => item.count > 0);
  const total = validItems.reduce((acc, item) => acc + item.count, 0);

  let accumulatedPercent = 0;

  return (
    <div className="donut-chart-wrapper" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="var(--sunken)"
          strokeWidth={strokeWidth}
        />

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
              transform={`rotate(-90 ${center} ${center})`}
            />
          );
        })}
      </svg>

      <div className="donut-center-content">
        <div className="donut-center-val num">{centerValue ?? total}</div>
        <div className="donut-center-lbl">{centerLabel || 'OBJECTS'}</div>
      </div>
    </div>
  );
}

export default function LaneAnalytics() {
  const [selectedView, setSelectedView] = useState('all');
  const [dynamicTracks, setDynamicTracks] = useState(null);

  useEffect(() => {
    fetch(`/videos/detections_data.json?t=${Date.now()}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setDynamicTracks(data);
      })
      .catch(() => {});
  }, []);

  const baseLaneVehicleData = {
    1: {
      id: 1,
      name: 'Lane 1 (Northbound)',
      direction: 'Northbound',
      subtitle: 'Emergency priority corridor and fast transit',
      totalVehicles: 8,
      pcuLoad: 8.2,
      dominantClass: 'Car (87.5%)',
      statusNote: 'Ambulance active',
      statusColor: 'red',
      classes: [
        { name: 'Car', key: 'car', count: 7, pct: 87.5, color: 'var(--accent)' },
        { name: 'Ambulance', key: 'ambulance', count: 1, pct: 12.5, color: 'var(--sig-red)' },
        { name: 'Auto-rickshaw', key: 'auto', count: 0, pct: 0, color: 'var(--amber)' },
        { name: 'Bike', key: 'bike', count: 0, pct: 0, color: 'var(--cyan)' },
        { name: 'Bus', key: 'bus', count: 0, pct: 0, color: 'var(--violet)' },
        { name: 'Truck', key: 'truck', count: 0, pct: 0, color: 'var(--orange)' },
        { name: 'Pedestrian', key: 'pedestrian', count: 0, pct: 0, color: 'var(--green)' }
      ]
    },
    2: {
      id: 2,
      name: 'Lane 2 (Eastbound)',
      direction: 'Eastbound',
      subtitle: 'Saturated arterial bottleneck and dense fleet',
      totalVehicles: 27,
      pcuLoad: 22.0,
      dominantClass: 'Car (44.4%) & Auto (37.0%)',
      statusNote: 'High congestion',
      statusColor: 'amber',
      classes: [
        { name: 'Car', key: 'car', count: 12, pct: 44.4, color: 'var(--accent)' },
        { name: 'Auto-rickshaw', key: 'auto', count: 10, pct: 37.0, color: 'var(--amber)' },
        { name: 'Pedestrian', key: 'pedestrian', count: 3, pct: 11.1, color: 'var(--green)' },
        { name: 'Bike', key: 'bike', count: 2, pct: 7.4, color: 'var(--cyan)' },
        { name: 'Bus', key: 'bus', count: 0, pct: 0, color: 'var(--violet)' },
        { name: 'Truck', key: 'truck', count: 0, pct: 0, color: 'var(--orange)' },
        { name: 'Ambulance', key: 'ambulance', count: 0, pct: 0, color: 'var(--sig-red)' }
      ]
    },
    3: {
      id: 3,
      name: 'Lane 3 (Southbound)',
      direction: 'Southbound',
      subtitle: 'Flyover descent, public transit and pedestrians',
      totalVehicles: 19,
      pcuLoad: 17.0,
      dominantClass: 'Pedestrian (42.1%) & Car (36.8%)',
      statusNote: 'Free-flow transit',
      statusColor: 'green',
      classes: [
        { name: 'Pedestrian', key: 'pedestrian', count: 8, pct: 42.1, color: 'var(--green)' },
        { name: 'Car', key: 'car', count: 7, pct: 36.8, color: 'var(--accent)' },
        { name: 'Bus', key: 'bus', count: 4, pct: 21.1, color: 'var(--violet)' },
        { name: 'Bike', key: 'bike', count: 0, pct: 0, color: 'var(--cyan)' },
        { name: 'Auto-rickshaw', key: 'auto', count: 0, pct: 0, color: 'var(--amber)' },
        { name: 'Truck', key: 'truck', count: 0, pct: 0, color: 'var(--orange)' },
        { name: 'Ambulance', key: 'ambulance', count: 0, pct: 0, color: 'var(--sig-red)' }
      ]
    },
    4: {
      id: 4,
      name: 'Lane 4 (Westbound)',
      direction: 'Westbound',
      subtitle: 'Approaching surge bottleneck and mixed fleet',
      totalVehicles: 21,
      pcuLoad: 13.4,
      dominantClass: 'Balanced (Auto / Car / Pedestrian)',
      statusNote: 'Surge spike warning (+23%)',
      statusColor: 'amber',
      classes: [
        { name: 'Auto-rickshaw', key: 'auto', count: 7, pct: 33.3, color: 'var(--amber)' },
        { name: 'Car', key: 'car', count: 7, pct: 33.3, color: 'var(--accent)' },
        { name: 'Pedestrian', key: 'pedestrian', count: 7, pct: 33.3, color: 'var(--green)' },
        { name: 'Bike', key: 'bike', count: 0, pct: 0, color: 'var(--cyan)' },
        { name: 'Bus', key: 'bus', count: 0, pct: 0, color: 'var(--violet)' },
        { name: 'Truck', key: 'truck', count: 0, pct: 0, color: 'var(--orange)' },
        { name: 'Ambulance', key: 'ambulance', count: 0, pct: 0, color: 'var(--sig-red)' }
      ]
    }
  };

  const laneVehicleData = { ...baseLaneVehicleData };
  if (dynamicTracks) {
    [1, 2, 3, 4].forEach((laneId) => {
      const track = dynamicTracks[laneId] || dynamicTracks[String(laneId)];
      if (track && track.vehicle_breakdown && Object.keys(track.vehicle_breakdown).length > 0) {
        const vb = track.vehicle_breakdown;
        const total = Object.values(vb).reduce((a, b) => a + b, 0) || track.queue_count || 1;

        laneVehicleData[laneId] = {
          ...laneVehicleData[laneId],
          totalVehicles: track.queue_count || total,
          pcuLoad: (track.density_percent * 0.28).toFixed(1),
          classes: [
            { name: 'Car', key: 'car', count: vb.car || 0, pct: Math.round(((vb.car || 0) / total) * 100), color: 'var(--accent)' },
            { name: 'Ambulance', key: 'ambulance', count: vb.ambulance || 0, pct: Math.round(((vb.ambulance || 0) / total) * 100), color: 'var(--sig-red)' },
            { name: 'Auto-rickshaw', key: 'auto', count: vb['auto-rickshaw'] || 0, pct: Math.round(((vb['auto-rickshaw'] || 0) / total) * 100), color: 'var(--amber)' },
            { name: 'Bike', key: 'bike', count: vb.bike || 0, pct: Math.round(((vb.bike || 0) / total) * 100), color: 'var(--cyan)' },
            { name: 'Bus', key: 'bus', count: vb.bus || 0, pct: Math.round(((vb.bus || 0) / total) * 100), color: 'var(--violet)' },
            { name: 'Truck', key: 'truck', count: vb.truck || 0, pct: Math.round(((vb.truck || 0) / total) * 100), color: 'var(--orange)' },
            { name: 'Pedestrian', key: 'pedestrian', count: vb.pedestrian || 0, pct: Math.round(((vb.pedestrian || 0) / total) * 100), color: 'var(--green)' }
          ]
        };
      }
    });
  }

  const currentLaneData = typeof selectedView === 'number' ? laneVehicleData[selectedView] : null;

  return (
    <div id="lane-analytics">
      {/* Metric Strip */}
      <div className="kg">
        <div>
          <span>Total objects</span>
          <b className="num">75</b>
        </div>
        <div>
          <span>Motorized</span>
          <b className="num">57</b>
        </div>
        <div>
          <span>Pedestrians</span>
          <b className="num">18</b>
        </div>
        <div>
          <span>Emergency</span>
          <b className="num">1 Amb</b>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs" style={{ marginBottom: 16 }}>
        <button
          className={`btn ${selectedView === 'all' ? 'on' : ''}`}
          onClick={() => setSelectedView('all')}
          type="button"
        >
          All 4 lanes
        </button>
        {[1, 2, 3, 4].map((num) => (
          <button
            key={num}
            className={`btn ${selectedView === num ? 'on' : ''}`}
            onClick={() => setSelectedView(num)}
            type="button"
          >
            Lane {num}
          </button>
        ))}
      </div>

      {/* All 4 Lanes Quad-Grid */}
      {selectedView === 'all' && (
        <div className="lanes-donut-grid">
          {[1, 2, 3, 4].map((laneNum) => {
            const lane = laneVehicleData[laneNum];
            const validClasses = lane.classes.filter((c) => c.count > 0);

            return (
              <div key={lane.id} className="lane-donut-card">
                <div className="lane-donut-header">
                  <div>
                    <span className="lane-donut-title">{lane.name}</span>
                    <div className="lane-donut-sub">{lane.subtitle}</div>
                  </div>
                  <span className={`bd ${lane.statusColor}`}>{lane.statusNote}</span>
                </div>

                <div className="lane-donut-body">
                  <DonutChart
                    items={lane.classes}
                    size={150}
                    strokeWidth={18}
                    centerValue={lane.totalVehicles}
                    centerLabel="OBJECTS"
                  />

                  <div className="donut-legend-stack">
                    {validClasses.map((item) => (
                      <div key={item.key} className="donut-legend-item">
                        <span className="legend-badge-pill">
                          <span className="legend-color-dot" style={{ backgroundColor: item.color }} />
                          <b>{item.name}</b>
                        </span>
                        <span className="num" style={{ fontSize: '13px' }}>
                          <b>{item.count}</b> <span style={{ color: 'var(--ink-3)', fontSize: '11.5px' }}>({item.pct}%)</span>
                        </span>
                      </div>
                    ))}

                    <div className="lane-pcu-meter">
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--ink-2)', marginBottom: 4 }}>
                        <span>PCU capacity occupancy:</span>
                        <span className="num"><b>{lane.pcuLoad} / 28.0 PCU</b></span>
                      </div>
                      <div className="bt">
                        <div style={{ width: `${Math.min(100, (lane.pcuLoad / 28.0) * 100)}%` }} />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="lane-donut-footer">
                  <span>Dominant: <b>{lane.dominantClass}</b></span>
                  <button
                    className="btn mini"
                    onClick={() => setSelectedView(laneNum)}
                    type="button"
                  >
                    Deep dive →
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Single Lane Deep Dive View */}
      {currentLaneData && (
        <div className="lane-deep-dive-panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
            <div>
              <h3 style={{ fontSize: '22px', fontWeight: 600 }}>
                {currentLaneData.name} — Detailed vehicle breakdown
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--ink-3)', marginTop: 2 }}>
                {currentLaneData.subtitle}
              </p>
            </div>
            <button className="btn" onClick={() => setSelectedView('all')} type="button">
              ← Back to all 4 lanes
            </button>
          </div>

          <div className="deep-dive-grid">
            <div className="deep-dive-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: '12px', color: 'var(--ink-3)', marginBottom: 14 }}>
                Modal distribution
              </span>
              <DonutChart
                items={currentLaneData.classes}
                size={190}
                strokeWidth={24}
                centerValue={currentLaneData.totalVehicles}
                centerLabel="OBJECTS"
              />
              <div style={{ marginTop: 16, display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}>
                {currentLaneData.classes.filter((c) => c.count > 0).map((item) => (
                  <span key={item.key} className="legend-badge-pill">
                    <span className="legend-color-dot" style={{ backgroundColor: item.color }} />
                    {item.name}: <b className="num">{item.count}</b> ({item.pct}%)
                  </span>
                ))}
              </div>
            </div>

            <div className="deep-dive-card">
              <span style={{ fontSize: '12px', color: 'var(--ink-3)', marginBottom: 12, display: 'block' }}>
                Vehicle class volume breakdown
              </span>

              <div className="vehicle-bars-container">
                {currentLaneData.classes.map((item) => {
                  const maxCount = Math.max(...currentLaneData.classes.map((c) => c.count), 1);
                  const barPercent = (item.count / maxCount) * 100;

                  return (
                    <div key={item.key} className="vehicle-bar-row">
                      <div className="vehicle-bar-meta">
                        <span>{item.name}</span>
                        <span className="num"><b>{item.count}</b> ({item.pct}%)</span>
                      </div>
                      <div className="vehicle-bar-track">
                        <div
                          className="vehicle-bar-fill"
                          style={{ width: `${barPercent}%`, backgroundColor: item.color }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="pcu-calc-banner">
                <span>PCU occupancy = Σ (count × weight) = <b className="num">{currentLaneData.pcuLoad} PCU</b></span>
                <span style={{ color: 'var(--ink-3)' }}>Max capacity: 28.0 PCU ({((currentLaneData.pcuLoad / 28.0) * 100).toFixed(1)}% load)</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cross-Lane Comparative Table */}
      <div className="card panel">
        <div className="t">
          <b>Cross-lane comparative traffic composition and PCU allocation</b>
          <span>Quad-channel volume comparison</span>
        </div>
        <table>
          <thead>
            <tr>
              <th>Lane approach</th>
              <th>Total detected</th>
              <th>Cars</th>
              <th>Auto-rickshaws</th>
              <th>Bikes</th>
              <th>Buses</th>
              <th>Ambulances</th>
              <th>Pedestrians</th>
              <th>PCU load</th>
            </tr>
          </thead>
          <tbody>
            {[1, 2, 3, 4].map((num) => {
              const l = laneVehicleData[num];
              const getCnt = (k) => l.classes.find((c) => c.key === k)?.count || 0;

              return (
                <tr key={num} className={selectedView === num ? 'hl' : ''}>
                  <td>
                    <b>{l.name}</b>
                    <span className="sub">{l.direction}</span>
                  </td>
                  <td className="num"><b>{l.totalVehicles}</b></td>
                  <td className="num">{getCnt('car') || '-'}</td>
                  <td className="num">{getCnt('auto') || '-'}</td>
                  <td className="num">{getCnt('bike') || '-'}</td>
                  <td className="num">{getCnt('bus') || '-'}</td>
                  <td>
                    {getCnt('ambulance') > 0 ? (
                      <span className="bd red" style={{ padding: '2px 6px', borderRadius: 3, fontSize: '11px' }}>
                        1 active
                      </span>
                    ) : (
                      <span className="num">-</span>
                    )}
                  </td>
                  <td className="num">{getCnt('pedestrian') || '-'}</td>
                  <td className="num"><b>{l.pcuLoad} PCU</b></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
