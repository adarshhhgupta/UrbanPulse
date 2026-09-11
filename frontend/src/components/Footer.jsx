import React from 'react';

export default function Footer() {
  return (
    <footer>
      <div className="footer-title">UrbanPulse &mdash; AI-Powered Junction Control</div>
      <div className="footer-sub">
        Major Project &bull; Traffic Management using Machine Learning &bull; Computer Science & Engineering
      </div>
      <div className="footer-disclaimer">
        All metrics shown are illustrative placeholders &mdash; replace with measured results after model training and SUMO validation. Designed for high-density 4-lane intersection telemetry.
      </div>
    </footer>
  );
}
