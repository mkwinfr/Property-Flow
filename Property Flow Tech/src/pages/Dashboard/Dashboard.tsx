
import React, { useState, useEffect } from "react";
import Dock, { type DockTabId } from "../../components/Dock/Dock";
import AppDrawer from "../../components/AppDrawer/AppDrawer";
import MakeReadyBoard from "../MakeReadyBoard/MakeReadyBoard.tsx";
import ApartmentDetailPage from "../../pages/ApartmentDetail/ApartmentDetail";
import MakeReadyWizard from "../MakeReadyWizard/MakeReadyWizard";
import { MakeReadyBoardProvider } from "../../hooks/useMakeReadyBoard";
import StartPunch from "../StartPunch/StartPunch";

const Dashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<DockTabId>("home");
  const [showAppDrawer, setShowAppDrawer] = useState(false);
  const [isClosingDrawer, setIsClosingDrawer] = useState(false);

  useEffect(() => {
    const handleNavigateToBoard = (e: Event) => {
      const customEvent = e as CustomEvent<{ turnId: string | null }>;
      setActiveTab("makeReady");
    };

    window.addEventListener("navigate-to-board", handleNavigateToBoard);
    return () => window.removeEventListener("navigate-to-board", handleNavigateToBoard);
  }, []);

  const handleToggleAppDrawer = () => {
    if (showAppDrawer && !isClosingDrawer) {
      setIsClosingDrawer(true);
      setTimeout(() => {
        setShowAppDrawer(false);
        setIsClosingDrawer(false);
      }, 260);
    } else if (!showAppDrawer) {
      setIsClosingDrawer(false);
      setShowAppDrawer(true);
    }
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

    case "wizard":
      return <MakeReadyWizard />;

    case "startPunch":
      return <StartPunch />;

    case "chat":
      return (
        <div className="dashboard-section">
          <h1 className="dashboard-title pf-page-title">Chat</h1>
          <p className="dashboard-subtitle pf-page-subtitle">
            Messaging and collaboration workspace coming soon.
          </p>
          <div className="dashboard-placeholder">
            Connect your team here to coordinate make readies and share
            updates in real time.
          </div>
        </div>
      );

    case "apartmentDetail":   // ⭐ NEW
      return <ApartmentDetailPage />;

    case "home":
    default:
      return (
        <div className="dashboard-section">
          <h1 className="dashboard-title pf-page-title">Dashboard</h1>
          <p className="dashboard-subtitle pf-page-subtitle">
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
    <MakeReadyBoardProvider>
      <div className="dashboard-root pf-page">
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
          onOpenAppDrawer={handleToggleAppDrawer}
          isDrawerOpen={showAppDrawer && !isClosingDrawer}
        />
      </div>
    </MakeReadyBoardProvider>
  );
};

export default Dashboard;
