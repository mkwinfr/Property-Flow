import React from "react";
import "./Inventory.css";

const Inventory: React.FC = () => {
  return (
    <div className="page-root">
      <header className="page-header">
        <h1 className="page-title">Inventory</h1>
        <p className="page-subtitle">
          Track parts, appliances, and supplies across your properties.
        </p>
      </header>

      <div className="page-body">
        <div className="page-placeholder">
          Inventory layout coming soon. You can wire this up to your data model
          whenever you&apos;re ready.
        </div>
      </div>
    </div>
  );
};

export default Inventory;
