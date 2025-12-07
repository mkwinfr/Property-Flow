import React from "react";
import "./StartPunch.css";

const StartPunch: React.FC = () => {
  return (
    <div className="page-root">
      <header className="page-header">
        <h1 className="page-title">Start New Punch</h1>
        <p className="page-subtitle">
          Kick off a new make ready punch and capture unit details from the
          field.
        </p>
      </header>

      <div className="page-body">
        <div className="page-placeholder">
          Start Punch workflow coming soon. This can become your unit selection,
          turn type, and initial checklist screen.
        </div>
      </div>
    </div>
  );
};

export default StartPunch;
