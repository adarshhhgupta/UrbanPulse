import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Overview from './components/Overview';
import LiveJunction from './components/LiveJunction';
import LaneAnalytics from './components/LaneAnalytics';
import DetectionModels from './components/DetectionModels';
import PredictionEngine from './components/PredictionEngine';
import Modules from './components/Modules';
import Violations from './components/Violations';
import Evaluation from './components/Evaluation';
import DashboardHub from './components/DashboardHub';
import Footer from './components/Footer';

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Normalize initial route from hash
  const getInitialPage = () => {
    const hash = window.location.hash.replace('#', '').toLowerCase();
    const validPages = [
      'dashboard',
      'overview',
      'live-junction',
      'lane-analytics',
      'detection-models',
      'prediction-engine',
      'modules',
      'violations',
      'evaluation'
    ];
    if (hash === 'overview' || hash === '') return 'dashboard';
    return validPages.includes(hash) ? hash : 'dashboard';
  };

  const [currentPage, setCurrentPage] = useState(getInitialPage);

  // Listen to browser navigation (back/forward & hash changes)
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '').toLowerCase();
      const validPages = [
        'dashboard',
        'live-junction',
        'lane-analytics',
        'detection-models',
        'prediction-engine',
        'modules',
        'violations',
        'evaluation'
      ];
      if (hash === 'overview' || hash === '') {
        setCurrentPage('dashboard');
      } else if (validPages.includes(hash)) {
        setCurrentPage(hash);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigateTo = (pageId) => {
    const target = pageId === 'overview' ? 'dashboard' : pageId;
    setCurrentPage(target);
    window.location.hash = target;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  // Page titles and metadata for dedicated view header
  const pageMeta = {
    'live-junction': {
      title: 'Live Junction Control Room',
      tag: 'Quad-Camera Surveillance & Dynamic Phase Sequencing',
      icon: (
        <svg className="icon text-green" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      )
    },
    'lane-analytics': {
      title: 'Lane Vehicle Analytics & Donut Graphs',
      tag: 'Spatial Perception & Multi-Class Distribution',
      icon: (
        <svg className="icon text-blue" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 2a10 10 0 0 1 10 10" />
          <circle cx="12" cy="12" r="4" />
        </svg>
      )
    },
    'detection-models': {
      title: 'Perception & Detection Models',
      tag: 'Computer Vision Architecture & Precision Metrics',
      icon: (
        <svg className="icon text-blue" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10" />
          <line x1="22" y1="12" x2="18" y2="12" />
          <line x1="6" y1="12" x2="2" y2="12" />
          <line x1="12" y1="6" x2="12" y2="2" />
          <line x1="12" y1="22" x2="12" y2="18" />
        </svg>
      )
    },
    'prediction-engine': {
      title: 'LSTM Predictive Signal Engine',
      tag: 'Time-Series Congestion Forecasting & Arbitration',
      icon: (
        <svg className="icon text-yellow" viewBox="0 0 24 24">
          <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
          <polyline points="17 6 23 6 23 12" />
        </svg>
      )
    },
    'modules': {
      title: 'Intelligent Feature Modules',
      tag: 'Algorithmic Sub-Systems & Watchdogs',
      icon: (
        <svg className="icon text-purple" viewBox="0 0 24 24">
          <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
          <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
          <line x1="6" y1="6" x2="6.01" y2="6" />
          <line x1="6" y1="18" x2="6.01" y2="18" />
        </svg>
      )
    },
    'violations': {
      title: 'Automated Enforcement (OCR)',
      tag: 'Stop-Line Infringements & Plate Telemetry',
      icon: (
        <svg className="icon text-red" viewBox="0 0 24 24">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      )
    },
    'evaluation': {
      title: 'System Evaluation & Benchmarks',
      tag: 'Microscopic Simulation & Empirical Results',
      icon: (
        <svg className="icon text-green" viewBox="0 0 24 24">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      )
    }
  };

  const isFrontPage = currentPage === 'dashboard' || currentPage === 'overview';

  return (
    <div className="app-container">
      {/* Mobile Header Bar */}
      <header className="mobile-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button className="hamburger-btn" onClick={toggleSidebar} aria-label="Toggle navigation menu">
            <svg className="icon" viewBox="0 0 24 24">
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#f8fafc' }}>UrbanPulse</span>
        </div>
        <div className="system-status-indicator" style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem' }}>
          <span className="pulse-dot" /> Live
        </div>
      </header>

      {/* Fixed Sidebar with Routing */}
      <Sidebar
        isOpen={sidebarOpen}
        onToggle={toggleSidebar}
        activePage={currentPage}
        onNavigate={navigateTo}
      />

      {/* Main Content Area */}
      <div className="main-wrapper">
        <div className="content-container">
          {isFrontPage ? (
            /* ==========================================================
               FRONT PAGE: MAIN DASHBOARD
               Shows Overview KPIs, Live Junction simulation, and the
               dedicated sub-systems directory hub.
               ========================================================== */
            <>
              <Overview onNavigate={navigateTo} />
              <LiveJunction />
              <DashboardHub onNavigate={navigateTo} />
            </>
          ) : (
            /* ==========================================================
               DEDICATED COMPONENT PAGE
               Shows ONLY the specific component requested, with a
               strictly professional breadcrumb header and back button.
               ========================================================== */
            <div className="dedicated-page-view">
              <div className="page-breadcrumb-bar">
                <div className="breadcrumb-left">
                  <button
                    className="breadcrumb-back-btn"
                    onClick={() => navigateTo('dashboard')}
                    title="Return to Main Dashboard"
                  >
                    <svg className="icon icon-sm" viewBox="0 0 24 24">
                      <line x1="19" y1="12" x2="5" y2="12" />
                      <polyline points="12 19 5 12 12 5" />
                    </svg>
                    Dashboard
                  </button>
                  <span className="breadcrumb-slash">/</span>
                  <span className="breadcrumb-page-name font-mono">
                    {pageMeta[currentPage]?.title || currentPage}
                  </span>
                </div>

                <div className="breadcrumb-right">
                  <div className="system-status-indicator" style={{ fontSize: '0.72rem', padding: '0.2rem 0.6rem' }}>
                    <span className="pulse-dot" /> Dedicated Workstation View
                  </div>
                  <button
                    className="return-dashboard-pill"
                    onClick={() => navigateTo('dashboard')}
                  >
                    ← Front Page
                  </button>
                </div>
              </div>

              {/* Dedicated Component View */}
              {currentPage === 'live-junction' && <LiveJunction />}
              {currentPage === 'lane-analytics' && <LaneAnalytics />}
              {currentPage === 'detection-models' && <DetectionModels />}
              {currentPage === 'prediction-engine' && <PredictionEngine />}
              {currentPage === 'modules' && <Modules />}
              {currentPage === 'violations' && <Violations />}
              {currentPage === 'evaluation' && <Evaluation />}
            </div>
          )}

          <Footer />
        </div>
      </div>
    </div>
  );
}
