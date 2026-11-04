import React, { useState } from 'react';

const DIRS = { 1: 'Northbound', 2: 'Eastbound', 3: 'Southbound', 4: 'Westbound' };

const SCENARIOS = {
  1: {
    n: 'Lane 1',
    sub: 'Steady discharge, no pre-emption needed',
    now: 30,
    obs: [40, 38, 36, 34, 32, 30, 30],
    f: [29, 28, 27, 26, 25],
    pcu: '4 PCU (3 cars, 1 bike)',
    rule: 'P3 active',
    rd: 'Current density'
  },
  2: {
    n: 'Lane 2',
    sub: 'Moderate inflow, near-term plateau',
    now: 44,
    obs: [30, 33, 36, 39, 41, 43, 44],
    f: [48, 52, 55, 57, 58],
    pcu: '6 PCU (2 cars, 3 auto-rickshaws)',
    rule: 'P3 active',
    rd: 'Current density'
  },
  3: {
    n: 'Lane 3',
    sub: 'Heavy queue, ambulance corridor upstream',
    now: 62,
    obs: [50, 52, 55, 57, 59, 61, 62],
    f: [65, 68, 70, 72, 74],
    pcu: '9 PCU (2 buses, 4 cars, 1 ambulance)',
    rule: 'P1 armed',
    rd: 'Emergency override'
  },
  4: {
    n: 'Lane 4',
    sub: 'Approaching bottleneck surge and predictive pre-emption trigger',
    now: 55,
    obs: [25, 28, 30, 36, 42, 48, 55],
    f: [62, 68, 72, 76, 78],
    pcu: '8 PCU (1 car, 3 auto-rickshaws, 2 pedestrians)',
    rule: 'P2 triggered',
    rd: 'Predictive congestion'
  }
};

const MODELS = [
  ['LSTM (proposed)', 'Best score', 'green', 3.21, 2.44],
  ['GRU (gated recurrent)', 'Competitive', 'blue', 3.58, 2.71],
  ['ARIMA (p=2, d=1, q=2)', 'Baseline', 'amber', 7.82, 5.94],
  ['Linear regression', 'Naive', 'red', 11.45, 9.10]
];

const MATRIX = [
  [
    'Priority 1 (highest)',
    'Emergency override',
    'Ambulance detected in any lane (visual confidence 0.85 or higher, or audio confirmation).',
    'End the active phase with a 3 s amber clearance, force the detected lane green, lock all opposing lanes to red, and send a corridor pre-emption message to the downstream junction (Junction 7) over MQTT.'
  ],
  [
    'Priority 2',
    'Predictive congestion',
    'LSTM forecasts a density increase above 20% in the next 90 s (queue accumulation shock).',
    'Extend the current green allocation early, or re-order the upcoming phase schedule, to flush the approaching bottleneck before the standing queue spills past the approach boundary.'
  ],
  [
    'Priority 3',
    'Current density',
    'Real-time density comparison across lanes (PCU-weighted vehicle count).',
    'Allocate green time in proportion to density: a higher real-time queue gets a longer split, using T_green = base + k x PCU.'
  ],
  [
    'Priority 4 (fallback)',
    'Fairness and starvation',
    'A lane has been red longer than the maximum threshold (over 120 s).',
    'Switch immediately to the starved approach regardless of its low comparative density, guaranteeing an upper bound on wait time for every driver.'
  ]
];

export default function PredictionEngine() {
  const [selectedLane, setSelectedLane] = useState(4);
  const s = SCENARIOS[selectedLane] || SCENARIOS[4];
  const f10 = s.f[4];
  const delta = f10 - s.now;

  // Chart coordinates
  const W = 900;
  const H = 340;
  const pl = 50;
  const pr = 20;
  const pt = 24;
  const pb = 34;

  const getX = (m) => pl + ((m + 30) / 40) * (W - pl - pr);
  const getY = (v) => pt + (1 - v / 100) * (H - pt - pb);

  const obsPoints = s.obs.map((v, i) => [-30 + i * 5, v]);
  const fcPoints = [[0, s.now], ...s.f.map((v, i) => [2 * (i + 1), v])];

  const obsPoly = obsPoints.map((p) => `${getX(p[0])},${getY(p[1])}`).join(' ');
  const fcPoly = fcPoints.map((p) => `${getX(p[0])},${getY(p[1])}`).join(' ');

  return (
    <div id="prediction-engine">
      {/* Lane Tabs */}
      <div className="tabs" style={{ marginBottom: 14 }}>
        {[1, 2, 3, 4].map((n) => (
          <button
            key={n}
            className={`btn ${n === selectedLane ? 'on' : ''}`}
            onClick={() => setSelectedLane(n)}
            type="button"
          >
            Lane {n}
          </button>
        ))}
      </div>

      {/* 4 Stat Cells */}
      <div className="stat4">
        <div>
          <span>Selected scenario</span>
          <b>{s.n}</b>
          <small>{s.sub}</small>
        </div>
        <div>
          <span>Observed density now</span>
          <b className="num" style={{ color: 'var(--amber)' }}>{s.now}%</b>
          <small>{s.pcu}</small>
        </div>
        <div>
          <span>10-min LSTM forecast</span>
          <b className="num" style={{ color: f10 > 70 ? 'var(--red)' : 'var(--green)' }}>
            {f10}%
          </b>
          <small>{delta >= 0 ? '+' : ''}{delta}% predicted shift</small>
        </div>
        <div>
          <span>Arbitration rule</span>
          <b>{s.rule}</b>
          <small>{s.rd}</small>
        </div>
      </div>

      {/* Chart Panel */}
      <div className="card panel">
        <div className="t">
          <b>{s.n} ({DIRS[selectedLane]}): 30 min observed, 10 min forecast</b>
          <span>Pre-emption ceiling 70%</span>
        </div>
        <div className="b" style={{ padding: '8px 12px' }}>
          <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
            {/* Shaded Forecast Zone */}
            <rect
              x={getX(0)}
              y={pt}
              width={W - pr - getX(0)}
              height={H - pt - pb}
              fill="var(--accent-soft)"
              opacity="0.7"
            />

            {/* Horizontal Gridlines & Y-Axis Labels */}
            {[0, 25, 50, 75, 100].map((v) => (
              <g key={v}>
                <line
                  x1={pl}
                  x2={W - pr}
                  y1={getY(v)}
                  y2={getY(v)}
                  stroke="var(--rule)"
                  strokeDasharray={v ? '2 4' : undefined}
                />
                <text
                  x={pl - 8}
                  y={getY(v) + 4}
                  textAnchor="end"
                  fill="var(--ink-3)"
                  fontSize="12"
                  fontFamily="var(--f-num)"
                >
                  {v}%
                </text>
              </g>
            ))}

            {/* X-Axis Timestamps */}
            {[
              [-30, '-30m'],
              [-20, '-20m'],
              [-10, '-10m'],
              [0, 'Now'],
              [4, '+4m'],
              [8, '+8m'],
              [10, '+10m']
            ].map(([m, l]) => (
              <text
                key={m}
                x={getX(m)}
                y={H - 10}
                textAnchor="middle"
                fill="var(--ink-3)"
                fontSize="12"
                fontFamily="var(--f-num)"
              >
                {l}
              </text>
            ))}

            {/* Pre-Emption Ceiling Line (70%) with LEFT-aligned label */}
            <line
              x1={pl}
              x2={W - pr}
              y1={getY(70)}
              y2={getY(70)}
              stroke="var(--red)"
              strokeDasharray="5 4"
            />
            <text
              x={pl + 6}
              y={getY(70) - 6}
              textAnchor="start"
              fill="var(--red)"
              fontSize="12"
              fontFamily="var(--f-sans)"
            >
              Pre-emption ceiling 70%
            </text>

            {/* Vertical Divider at Now */}
            <line
              x1={getX(0)}
              x2={getX(0)}
              y1={pt}
              y2={H - pb}
              stroke="var(--accent)"
              strokeDasharray="3 3"
            />

            {/* Observed Polyline */}
            <polyline
              fill="none"
              stroke="var(--accent)"
              strokeWidth="2.5"
              points={obsPoly}
            />

            {/* Forecast Polyline */}
            <polyline
              fill="none"
              stroke="var(--amber)"
              strokeWidth="2.5"
              strokeDasharray="6 4"
              points={fcPoly}
            />

            {/* Observed Points */}
            {obsPoints.map((p, idx) => (
              <circle
                key={`obs-${idx}`}
                cx={getX(p[0])}
                cy={getY(p[1])}
                r="3.5"
                fill="var(--accent)"
              />
            ))}

            {/* Forecast Points (Hollow) */}
            {fcPoints.slice(1).map((p, idx) => (
              <circle
                key={`fc-${idx}`}
                cx={getX(p[0])}
                cy={getY(p[1])}
                r="3.5"
                fill="var(--paper)"
                stroke="var(--amber)"
                strokeWidth="2"
              />
            ))}

            {/* Now Circle & Marker */}
            <circle
              cx={getX(0)}
              cy={getY(s.now)}
              r="6"
              fill="var(--paper)"
              stroke="var(--accent)"
              strokeWidth="3"
            />
            <text
              x={getX(0)}
              y={pt - 8}
              textAnchor="middle"
              fill="var(--accent)"
              fontSize="14"
              fontWeight="600"
              fontFamily="var(--f-sans)"
            >
              Now, {s.now}%
            </text>
          </svg>
        </div>
      </div>

      {/* Forecast Error Benchmarks Table */}
      <div className="card panel">
        <div className="t">
          <b>Forecast error: deep sequence models vs statistical baselines</b>
          <span>10-min horizon, Caltrans PeMS plus junction dataset</span>
        </div>
        <table>
          <thead>
            <tr>
              <th>Model</th>
              <th>Standing</th>
              <th style={{ width: '30%' }}>RMSE</th>
              <th style={{ width: '30%' }}>MAE</th>
            </tr>
          </thead>
          <tbody>
            {MODELS.map(([name, standing, badgeCol, rmse, mae], i) => (
              <tr key={name} className={i === 0 ? 'hl' : ''}>
                <td>{name}</td>
                <td>
                  <span
                    className={`bd ${badgeCol}`}
                    style={{ padding: '2px 8px', borderRadius: 3, fontSize: '11.5px' }}
                  >
                    {standing}
                  </span>
                </td>
                <td>
                  <div className="bar2">
                    <div className="tr">
                      <div
                        style={{
                          width: `${(rmse / 12) * 100}%`,
                          background: badgeCol === 'blue' ? 'var(--accent)' : `var(--${badgeCol})`
                        }}
                      />
                    </div>
                    <span className="num">{rmse}%</span>
                  </div>
                </td>
                <td>
                  <div className="bar2">
                    <div className="tr">
                      <div
                        style={{
                          width: `${(mae / 12) * 100}%`,
                          background: badgeCol === 'blue' ? 'var(--accent)' : `var(--${badgeCol})`
                        }}
                      />
                    </div>
                    <span className="num">{mae}%</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Priority Arbitration Matrix Table */}
      <div className="card panel">
        <div className="t">
          <b>Decision engine: priority arbitration matrix</b>
          <span>Strict hierarchy P1 over P2 over P3 over P4</span>
        </div>
        <table>
          <thead>
            <tr>
              <th style={{ width: '22%' }}>Priority level</th>
              <th style={{ width: '36%' }}>Condition trigger</th>
              <th style={{ width: '42%' }}>Actuation and control output</th>
            </tr>
          </thead>
          <tbody>
            {MATRIX.map(([level, trigger, condition, actuation], i) => {
              const ruleKey = `P${i + 1}`;
              const isRuleActive = s.rule.startsWith(ruleKey);

              return (
                <tr key={level} className={isRuleActive ? 'hl' : ''}>
                  <td>
                    {level}
                    <span className="sub" style={{ color: 'var(--ink)' }}>
                      <b>{trigger}</b>
                    </span>
                  </td>
                  <td>{condition}</td>
                  <td>{actuation}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
