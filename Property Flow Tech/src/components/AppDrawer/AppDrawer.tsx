
import React from "react";
import "./AppDrawer.css";
import { Boxes, Users, Camera, Settings } from "lucide-react";

interface AppDrawerProps {
  isOpen: boolean;
  isClosing: boolean;
  onClose: () => void;
}

const AppDrawer: React.FC<AppDrawerProps> = ({
  isOpen,
  isClosing,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="app-drawer-overlay"
      onClick={() => {
        if (!isClosing) onClose();
      }}
    >
      <div
        className={
          "app-drawer-panel" +
          (isClosing ? " app-drawer-panel--closing" : "")
        }
        onClick={(e) => e.stopPropagation()}
      >
        <div className="app-drawer-header">
          <div className="app-drawer-handle" />
          <h2 className="app-drawer-title">Quick Menu</h2>
          <p className="app-drawer-subtitle">Access your tools instantly</p>
        </div>

        <div className="app-drawer-grid">
          <button className="app-drawer-item" type="button">
            <span className="app-drawer-icon" aria-hidden="true">
              <Boxes />
            </span>
            <span className="app-drawer-label">Inventory</span>
          </button>

          <button className="app-drawer-item" type="button">
            <span className="app-drawer-icon" aria-hidden="true">
              <Users />
            </span>
            <span className="app-drawer-label">Employees</span>
          </button>

          <button className="app-drawer-item" type="button">
            <span className="app-drawer-icon" aria-hidden="true">
              <Camera />
            </span>
            <span className="app-drawer-label">Camera</span>
          </button>

          <button className="app-drawer-item" type="button">
            <span className="app-drawer-icon" aria-hidden="true">
              <Settings />
            </span>
            <span className="app-drawer-label">Settings</span>
          </button>
        </div>

        <button
          className="app-drawer-close"
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (!isClosing) onClose();
          }}
        >
          Close
        </button>
      </div>
    </div>
  );
};

export default AppDrawer;
