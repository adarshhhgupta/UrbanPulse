import React, { useState, useEffect } from 'react';

export default function Sidebar({ isOpen, onToggle }) {
  const [activeSection, setActiveSection] = useState('overview');

  const navItems = [
    { id: 'overview', label: 'Overview', icon: (
      <svg className="icon" viewBox="0 0 24 24">
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
      </svg>
    )},
    { id: 'live-junction', label: 'Live Junction', icon: (
      <svg className="icon" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    )},
    { id: 'lane-analytics', label: 'Lane Analytics', icon: (
      <svg className="icon" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 2a10 10 0 0 1 10 10" />
        <circle cx="12" cy="12" r="4" />
      </svg>
    )},
    { id: 'detection-models', label: 'Detection Models', icon: (
      <svg className="icon" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10" />
        <line x1="22" y1="12" x2="18" y2="12" />
        <line x1="6" y1="12" x2="2" y2="12" />
        <line x1="12" y1="6" x2="12" y2="2" />
        <line x1="12" y1="22" x2="12" y2="18" />
      </svg>
    )},
    { id: 'prediction-engine', label: 'Prediction Engine', icon: (
      <svg className="icon" viewBox="0 0 24 24">
        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
        <polyline points="17 6 23 6 23 12" />
      </svg>
    )},
    { id: 'modules', label: 'Feature Modules', icon: (
      <svg className="icon" viewBox="0 0 24 24">
        <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
        <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
        <line x1="6" y1="6" x2="6.01" y2="6" />
        <line x1="6" y1="18" x2="6.01" y2="18" />
      </svg>
    )},
    { id: 'violations', label: 'Violations', icon: (
      <svg className="icon" viewBox="0 0 24 24">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    )},
    { id: 'evaluation', label: 'Evaluation', icon: (
      <svg className="icon" viewBox="0 0 24 24">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
    )}
  ];

  useEffect(() => {
    const handleScroll = () => {
      const scrollPos = window.scrollY + 140;
      for (const item of navItems) {
        const el = document.getElementById(item.id);
        if (el) {
          const top = el.offsetTop;
          const height = el.offsetHeight;
          if (scrollPos >= top && scrollPos < top + height) {
            setActiveSection(item.id);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="project-branding">
            <div className="brand-mark">
              <svg className="icon icon-sm" viewBox="0 0 24 24">
                <polygon points="12 2 2 7 12 12 22 7 12 2" />
                <polyline points="2 17 12 22 22 17" />
                <polyline points="2 12 12 17 22 12" />
              </svg>
            </div>
            <div>
              <div className="brand-title">UrbanPulse</div>
              <div className="brand-subtitle">ML Junction Control</div>
            </div>
          </div>
          <div className="system-status-indicator">
            <span className="pulse-dot"></span> System: Live
          </div>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              className={`nav-link ${activeSection === item.id ? 'active' : ''}`}
              onClick={() => {
                setActiveSection(item.id);
                if (isOpen && onToggle) onToggle();
              }}
            >
              {item.icon}
              <span>{item.label}</span>
            </a>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="system-metric-pill">
            <span className="pill-title">Inference Engine</span>
            <span className="pill-val">YOLOv8s + LSTM</span>
          </div>
          <div className="system-metric-pill">
            <span className="pill-title">Primary Backend</span>
            <span className="pill-val">FastAPI + PostgreSQL</span>
          </div>
          <div className="system-metric-pill">
            <span className="pill-title">Container Stack</span>
            <span className="pill-val">Docker Compose</span>
          </div>
        </div>
      </aside>

      {/* Mobile overlay backdrop */}
      {isOpen && <div className="sidebar-overlay" onClick={onToggle} />}
    </>
  );
}
