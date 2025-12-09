import React from "react";

const SplashScreen: React.FC = () => {
  return (
    <div className="pf-splash-root">
      <div className="pf-splash-overlay" />

      {/* Neon outline cards */}
      <div className="pf-floating-cards">
        <div className="pf-floating-card pf-card--toolbox">
          <div className="pf-emoji">🧰</div>
        </div>
        <div className="pf-floating-card pf-card--screwdriver">
          <div className="pf-emoji">🪛</div>
        </div>
        <div className="pf-floating-card pf-card--hammer-wrench">
          <div className="pf-emoji">🛠️</div>
        </div>
        <div className="pf-floating-card pf-card--lightbulb">
          <div className="pf-emoji">💡</div>
        </div>
        <div className="pf-floating-card pf-card--gear">
          <div className="pf-emoji">⚙️</div>
        </div>
        <div className="pf-floating-card pf-card--building">
          <div className="pf-emoji">🏢</div>
        </div>
      </div>

      <div className="pf-splash-content">
        <div className="pf-logo-sequence">
          <div className="pf-logo-icon">
            <div className="pf-logo-circle">
              <span className="pf-logo-wrench">🔧</span>
            </div>
          </div>

          <div className="pf-logo-building">
            <div className="pf-building-block pf-building-block--tall" />
            <div className="pf-building-block pf-building-block--short" />
            <div className="pf-building-block pf-building-block--medium" />
          </div>

          <div className="pf-logo-text">
            <span className="pf-logo-main">Property Flow</span>
            <span className="pf-logo-sub">Tech</span>
          </div>

          <div className="pf-loading-bar">
            <div className="pf-loading-fill" />
          </div>
        </div>

        <p className="pf-splash-caption">Optimizing the flow of every turn.</p>
      </div>
    </div>
  );
};

export default SplashScreen;
