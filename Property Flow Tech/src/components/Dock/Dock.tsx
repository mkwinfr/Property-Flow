import React from "react";
import "./Dock.css";
import {
  Home,
  ClipboardList,
  Hammer,
  MessageCircle,
  Grid3X3,
} from "lucide-react";

export type DockTabId = "home" | "makeReady" | "startPunch" | "chat";

interface DockProps {
  activeTab: DockTabId;
  onTabChange: (tab: DockTabId) => void;
  onOpenAppDrawer: () => void;
  isDrawerOpen?: boolean;
}

const Dock: React.FC<DockProps> = ({
  activeTab,
  onTabChange,
  onOpenAppDrawer,
  isDrawerOpen = false,
}) => {
  return (
    <div className="bottom-nav-shell">
      <nav className="bottom-nav" aria-label="Primary navigation">
        <div className="bottom-nav-row">
          {/* Left icons */}
          <div
            role="button"
            aria-label="Home"
            className={
              "icon-button" +
              (activeTab === "home" ? " icon-button--active" : "")
            }
            onClick={() => onTabChange("home")}
          >
            <Home className="icon-button__icon" />
          </div>

          <div
            role="button"
            aria-label="Make ready"
            className={
              "icon-button" +
              (activeTab === "makeReady" ? " icon-button--active" : "")
            }
            onClick={() => onTabChange("makeReady")}
          >
            <ClipboardList className="icon-button__icon" />
          </div>

          {/* Center drawer */}
          <div
            role="button"
            aria-label="Open app drawer"
            className={
              "icon-button icon-button--drawer" +
              (isDrawerOpen ? " icon-button--drawer-open" : "")
            }
            onClick={onOpenAppDrawer}
          >
            <Grid3X3 className="icon-button__icon" />
          </div>

          {/* Right icons */}
          <div
            role="button"
            aria-label="Start punch"
            className={
              "icon-button" +
              (activeTab === "startPunch" ? " icon-button--active" : "")
            }
            onClick={() => onTabChange("startPunch")}
          >
            <Hammer className="icon-button__icon" />
          </div>

          <div
            role="button"
            aria-label="Chat"
            className={
              "icon-button" +
              (activeTab === "chat" ? " icon-button--active" : "")
            }
            onClick={() => onTabChange("chat")}
          >
            <MessageCircle className="icon-button__icon" />
          </div>
        </div>
      </nav>
    </div>
  );
};

export default Dock;
