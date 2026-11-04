import React from 'react';

export default function Footer() {
  return (
    <footer>
      <div className="t">UrbanPulse: AI-powered junction control</div>
      <div className="s">
        Major project, traffic management using machine learning, Computer Science and Engineering.
      </div>

      <div className="st">
        <div>
          <span>Inference</span>
          <b>YOLOv8 and LSTM</b>
        </div>
        <div>
          <span>Backend</span>
          <b>FastAPI and PostgreSQL</b>
        </div>
        <div>
          <span>Deployment</span>
          <b>Docker Compose</b>
        </div>
      </div>

      <div className="d">
        All metrics shown are illustrative placeholders. Replace them with measured results after model training and SUMO validation.
      </div>
    </footer>
  );
}
