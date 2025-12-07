import React from "react";
import "./Settings.css";

const Settings: React.FC = () => {
  return (
    <div className="page-root">
      <header className="page-header">
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">
          Configure Property Flow Tech for your team and workflow.
        </p>
      </header>

      <div className="page-body">
        <div className="page-placeholder">
          Settings controls coming soon. This is where you can add theme
          options, notifications, property configuration, and more.
        </div>
      </div>
    </div>
  );
};

export default Settings;
