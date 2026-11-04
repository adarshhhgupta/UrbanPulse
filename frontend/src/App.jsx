import React, { useState, useEffect } from 'react';
import TopNav from './components/TopNav';
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

const PAGE_META = {
  'live-junction': ['Live junction control room', 'Quad-camera surveillance and dynamic phase sequencing.'],
  'lane-analytics': ['Lane vehicle analytics and donut graphs', 'Spatial perception and multi-class distribution across all four approaches.'],
  'detection-models': ['Perception and detection models', 'Computer vision architecture and precision metrics.'],
  'prediction-engine': ['LSTM predictive signal engine', 'Time-series congestion forecasting and priority arbitration.'],
  'modules': ['Intelligent feature modules', 'Algorithmic sub-systems and watchdogs.'],
  'violations': ['Automated enforcement (OCR)', 'Stop-line infringements and licence plate telemetry.'],
  'evaluation': ['System evaluation and benchmarks', 'Microscopic simulation and empirical results.']
};

export default function App() {
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem('up-theme') || 'light';
    } catch (e) {
      return 'light';
    }
  });

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
    try {
      localStorage.setItem('up-theme', nextTheme);
    } catch (e) {}
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

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
    window.scrollTo(0, 0);
  };

  const isFrontPage = currentPage === 'dashboard' || currentPage === 'overview';
  const meta = PAGE_META[currentPage];

  return (
    <div className="app-container">
      {/* Sticky Top Navigation */}
      <TopNav
        activePage={currentPage}
        onNavigate={navigateTo}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      {/* Main Content Area */}
      <main className="wrap main-wrapper" id="app">
        {isFrontPage ? (
          <>
            <Overview onNavigate={navigateTo} />
            <LiveJunction isDedicated={false} />
            <DashboardHub onNavigate={navigateTo} />
          </>
        ) : (
          <div className="dedicated-page-view">
            {meta && (
              <div className="pagehead">
                <button
                  className="back"
                  onClick={() => navigateTo('dashboard')}
                  type="button"
                >
                  ← Dashboard
                </button>
                <h1>{meta[0]}</h1>
                <p>{meta[1]}</p>
              </div>
            )}

            {currentPage === 'live-junction' && <LiveJunction isDedicated={true} />}
            {currentPage === 'lane-analytics' && <LaneAnalytics />}
            {currentPage === 'detection-models' && <DetectionModels />}
            {currentPage === 'prediction-engine' && <PredictionEngine />}
            {currentPage === 'modules' && <Modules />}
            {currentPage === 'violations' && <Violations />}
            {currentPage === 'evaluation' && <Evaluation />}
          </div>
        )}

        <Footer />
      </main>
    </div>
  );
}
