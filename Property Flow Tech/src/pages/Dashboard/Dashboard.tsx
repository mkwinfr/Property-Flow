
import React, { useState } from "react";
import Dock, { type DockTabId } from "../../components/Dock/Dock";
import AppDrawer from "../../components/AppDrawer/AppDrawer";
import MakeReadyBoard from "../MakeReadyBoard/MakeReadyBoard.tsx";

import StartPunch from "../StartPunch/StartPunch";
import "./Dashboard.css";

const Dashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<DockTabId>("home");
  const [showAppDrawer, setShowAppDrawer] = useState(false);
  const [isClosingDrawer, setIsClosingDrawer] = useState(false);

  const handleOpenAppDrawer = () => {
    setIsClosingDrawer(false);
    setShowAppDrawer(true);
  };

  const handleCloseAppDrawer = () => {
    setIsClosingDrawer(true);
    setTimeout(() => {
      setShowAppDrawer(false);
      setIsClosingDrawer(false);
    }, 260);
  };

  const renderTab = () => {
    switch (activeTab) {
      case "makeReady":
        return <MakeReadyBoard />;
      case "startPunch":
        return <StartPunch />;
      case "chat":
        return (
          <div className="dashboard-section">
            <h1 className="dashboard-title">Chat</h1>
            <p className="dashboard-subtitle">
              Messaging and collaboration workspace coming soon.
            </p>
            <div className="dashboard-placeholder">
              Connect your team here to coordinate make readies and share
              updates in real time.
            </div>
          </div>
        );
      case "home":
      default:
        return (
          <div className="dashboard-section">
            <h1 className="dashboard-title">Dashboard</h1>
            <p className="dashboard-subtitle">
              At-a-glance view of your property operations.
            </p>
            <div className="dashboard-placeholder">
              Use the dock to open the Make Ready Board, start a new punch, or
              explore upcoming tools in the drawer.
            </div>
          </div>
        );
    }
  };

  return (
    <div className="dashboard-root">
      <div key={activeTab} className="dashboard-content tab-transition">
        {renderTab()}
      </div>

      <AppDrawer
        isOpen={showAppDrawer}
        isClosing={isClosingDrawer}
        onClose={handleCloseAppDrawer}
      />

      <Dock
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOpenAppDrawer={handleOpenAppDrawer}
        isDrawerOpen={showAppDrawer && !isClosingDrawer}
      />
    </div>
  );
};

export default Dashboard;
