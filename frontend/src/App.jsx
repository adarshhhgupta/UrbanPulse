import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import Overview from './components/Overview';
import LiveJunction from './components/LiveJunction';
import LaneAnalytics from './components/LaneAnalytics';
import DetectionModels from './components/DetectionModels';
import PredictionEngine from './components/PredictionEngine';
import Modules from './components/Modules';
import Violations from './components/Violations';
import Evaluation from './components/Evaluation';
import Footer from './components/Footer';

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

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

      {/* Fixed Sidebar */}
      <Sidebar isOpen={sidebarOpen} onToggle={toggleSidebar} />

      {/* Main Content Area */}
      <div className="main-wrapper">
        <div className="content-container">
          <Overview />
          <LiveJunction />
          <LaneAnalytics />
          <DetectionModels />
          <PredictionEngine />
          <Modules />
          <Violations />
          <Evaluation />
          <Footer />
        </div>
      </div>
    </div>
  );
}
