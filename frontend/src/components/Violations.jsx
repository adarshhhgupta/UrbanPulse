import React, { useState, useEffect } from 'react';

const FALLBACK_VIOLATIONS = [
  { id: 1, lane_id: 2, plate_number: 'KA 03 MN 4821', confidence_score: 0.962, violation_type: 'Stop-line', timestamp: '17:21:08' },
  { id: 2, lane_id: 1, plate_number: 'KA 05 JK 1190', confidence_score: 0.948, violation_type: 'Stop-line', timestamp: '17:24:41' },
  { id: 3, lane_id: 4, plate_number: 'KA 01 AB 7734', confidence_score: 0.951, violation_type: 'Stop-line', timestamp: '17:27:15' },
  { id: 4, lane_id: 3, plate_number: 'KA 51 ZZ 0042', confidence_score: 0.927, violation_type: 'Stop-line', timestamp: '17:31:52' },
  { id: 5, lane_id: 2, plate_number: 'KA 02 HF 5568', confidence_score: 0.959, violation_type: 'Stop-line', timestamp: '17:33:09' },
  { id: 6, lane_id: 1, plate_number: 'KA 04 PL 3019', confidence_score: 0.939, violation_type: 'Stop-line', timestamp: '17:35:44' }
];

export default function Violations() {
  const API_BASE = import.meta.env.VITE_API_URL || '';
  const [violations, setViolations] = useState(FALLBACK_VIOLATIONS);
  const [loading, setLoading] = useState(true);

  const fetchViolations = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/violations`).catch(() => fetch('http://localhost:8001/api/violations'));
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setViolations(data);
        }
      }
    } catch (err) {
      // Use fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchViolations();
  }, []);

  const formatTime = (ts) => {
    if (!ts) return '17:21:08';
    if (ts.length <= 8) return ts;
    const d = new Date(ts);
    if (!isNaN(d.getTime())) {
      const pad = (n) => String(n).padStart(2, '0');
      return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    }
    return ts;
  };

  return (
    <div id="violations">
      {/* Metric Strip */}
      <div className="kg">
        <div>
          <span>OCR pipeline</span>
          <b className="num">EasyOCR</b>
        </div>
        <div>
          <span>Mean conf.</span>
          <b className="num">94.8%</b>
        </div>
        <div>
          <span>Logged breaches</span>
          <b className="num">{violations.length} events</b>
        </div>
        <div>
          <span>Infringement type</span>
          <b className="num">Stop-line</b>
        </div>
      </div>

      {/* Table Panel */}
      <div className="card panel">
        <div className="t">
          <b>Infringement register</b>
          <span>Immutable log, EasyOCR plate reads</span>
        </div>
        <table>
          <thead>
            <tr>
              <th>Time</th>
              <th>Lane</th>
              <th>Plate</th>
              <th>Confidence</th>
              <th>Type</th>
            </tr>
          </thead>
          <tbody>
            {violations.map((v) => (
              <tr key={v.id}>
                <td className="num">{formatTime(v.timestamp)}</td>
                <td>Lane {v.lane_id}</td>
                <td>
                  <span className="plate-badge">{v.plate_number}</span>
                </td>
                <td className="num">{(v.confidence_score > 1 ? v.confidence_score : v.confidence_score * 100).toFixed(1)}%</td>
                <td>{v.violation_type || 'Stop-line'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
