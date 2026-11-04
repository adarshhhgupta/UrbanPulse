import React, { useState, useEffect } from 'react';

const PAGES = [
  ['dashboard', 'Dashboard'],
  ['live-junction', 'Live junction'],
  ['lane-analytics', 'Lane analytics'],
  ['detection-models', 'Detection'],
  ['prediction-engine', 'Prediction'],
  ['modules', 'Modules'],
  ['violations', 'Violations'],
  ['evaluation', 'Evaluation']
];

export default function TopNav({ activePage = 'dashboard', onNavigate, theme = 'light', onToggleTheme }) {
  const [clockTime, setClockTime] = useState('--:--:--');
  const [dateStr, setDateStr] = useState('');

  const pad = (n) => String(n).padStart(2, '0');

  useEffect(() => {
    const updateClock = () => {
      const d = new Date();
      setClockTime(`${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`);
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      setDateStr(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${days[d.getDay()]} · UTC+05:30`);
    };

    updateClock();
    const timer = setInterval(updateClock, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleLinkClick = (id) => {
    if (onNavigate) {
      onNavigate(id);
    } else {
      window.location.hash = id;
    }
  };

  return (
    <header className="topnav">
      <div className="wrap">
        <button
          className="brand"
          onClick={() => handleLinkClick('dashboard')}
          aria-label="UrbanPulse home"
        >
          <svg viewBox="0 0 28 28" aria-hidden="true">
            <rect width="28" height="28" rx="3" fill="var(--accent)" />
            <path d="M12 4h4v7h7v4h-7v9h-4v-9H5v-4h7z" fill="var(--paper)" />
            <circle cx="14" cy="13" r="2.2" fill="var(--accent)" />
          </svg>
          <span>
            <b>UrbanPulse</b>
            <small>ML junction control</small>
          </span>
        </button>

        <nav className="links" aria-label="Main navigation">
          {PAGES.map(([id, label]) => {
            const isActive =
              activePage === id ||
              ((activePage === 'dashboard' || activePage === 'overview' || !activePage) && id === 'dashboard');

            return (
              <button
                key={id}
                className={isActive ? 'on' : ''}
                onClick={() => handleLinkClick(id)}
              >
                {label}
              </button>
            );
          })}
        </nav>

        <div className="navr">
          <span className="status">
            <i></i>System live
          </span>
          <div className="clock">
            <b className="num">{clockTime}</b>
            <span>{dateStr}</span>
          </div>
          <button
            className="tt"
            onClick={onToggleTheme}
            aria-label="Toggle light/dark theme"
            title="Toggle theme"
          >
            {theme === 'dark' ? (
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}

