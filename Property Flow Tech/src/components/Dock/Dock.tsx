import React from "react";
import {
  Home,
  ClipboardList,
  Wrench,
  MessageCircle,
  Building2,
  Grid,
} from "lucide-react";
import "./Dock.css";

export type DockTabId =
  | "home"
  | "apartmentDetail"
  | "makeReady"
  | "startPunch"
  | "chat";

interface DockProps {
  activeTab: DockTabId;
  onTabChange: (tab: DockTabId) => void;
  onOpenAppDrawer?: () => void;
  isDrawerOpen?: boolean;
}

const leftTabs: {
  id: DockTabId;
  label: string;
  icon: React.ReactNode;
}[] = [
  { id: "home", label: "Home", icon: <Home size={22} /> },
  {
    id: "apartmentDetail",
    label: "Apartment Detail",
    icon: <Building2 size={22} />,
  },
  {
    id: "makeReady",
    label: "Make Ready",
    icon: <ClipboardList size={22} />,
  },
];

// Note: using id "startPunch" but label "Work Orders" so TS + routing stay happy
const rightTabs: {
  id: DockTabId;
  label: string;
  icon: React.ReactNode;
}[] = [
  {
    id: "chat",
    label: "Chat",
    icon: <MessageCircle size={22} />,
  },
  {
    id: "startPunch",
    label: "Work Orders",
    icon: <Wrench size={22} />,
  },
];

const Dock: React.FC<DockProps> = ({
  activeTab,
  onTabChange,
  onOpenAppDrawer,
  isDrawerOpen,
}) => {
  const renderTabButton = (
    id: DockTabId,
    label: string,
    icon: React.ReactNode,
  ) => {
    const isActive = id === activeTab;

    return (
      <button
        key={id}
        type="button"
        className={"dock-item" + (isActive ? " dock-item--active" : "")}
        onClick={() => onTabChange(id)}
        aria-label={label}
      >
        <span className="dock-item__icon">{icon}</span>
        <span className="dock-item__label">{label}</span>
      </button>
    );
  };

  const appsIsActive = Boolean(isDrawerOpen);

  return (
    <nav className="dock">
      <div className="dock-inner">
        <div className="dock-group dock-group--left">
          {leftTabs.map((tab) => renderTabButton(tab.id, tab.label, tab.icon))}
        </div>

        {onOpenAppDrawer && (
          <button
            type="button"
            className={
              "dock-item dock-item--apps" +
              (appsIsActive ? " dock-item--apps-active" : "")
            }
            onClick={onOpenAppDrawer}
            aria-label="App drawer"
          >
            <span className="dock-item__icon dock-item__icon--apps">
              <Grid size={20} />
            </span>
            <span className="dock-item__label">Apps</span>
          </button>
        )}

        <div className="dock-group dock-group--right">
          {rightTabs.map((tab) => renderTabButton(tab.id, tab.label, tab.icon))}
        </div>
      </div>
    </nav>
  );
};

export default Dock;
