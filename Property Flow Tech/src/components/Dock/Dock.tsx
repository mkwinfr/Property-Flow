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

const dockTabsLeft: {
  id: DockTabId;
  label: string;
  icon: React.ReactNode;
}[] = [
  { id: "home", label: "Home", icon: <Home size={22} /> },
  {
    id: "apartmentDetail",
    label: "Apt Detail",
    icon: <Building2 size={22} />,
  },
];

const dockTabsRight: {
  id: DockTabId;
  label: string;
  icon: React.ReactNode;
}[] = [
  {
    id: "makeReady",
    label: "Make Ready",
    icon: <ClipboardList size={22} />,
  },
  {
    id: "startPunch",
    label: "Start Punch",
    icon: <Wrench size={22} />,
  },
  {
    id: "chat",
    label: "Chat",
    icon: <MessageCircle size={22} />,
  },
];

const Dock: React.FC<DockProps> = ({
  activeTab,
  onTabChange,
  onOpenAppDrawer,
  isDrawerOpen,
}) => {
  const handleClick = (tab: DockTabId) => {
    onTabChange(tab);
  };

  const renderDockButton = (id: DockTabId, icon: React.ReactNode, label: string) => {
    const isActive = id === activeTab;
    return (
      <button
        key={id}
        type="button"
        className={"dock-item" + (isActive ? " dock-item--active" : "")}
        onClick={() => handleClick(id)}
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
          {dockTabsLeft.map((tab) =>
            renderDockButton(tab.id, tab.icon, tab.label)
          )}
        </div>

        {onOpenAppDrawer && (
          <button
            type="button"
            className={
              "dock-item dock-item--apps" +
              (appsIsActive ? " dock-item--active" : "")
            }
            onClick={onOpenAppDrawer}
            aria-label="Apps"
          >
            <span className="dock-item__icon">
              <Grid size={22} />
            </span>
            <span className="dock-item__label">Apps</span>
          </button>
        )}

        <div className="dock-group dock-group--right">
          {dockTabsRight.map((tab) =>
            renderDockButton(tab.id, tab.icon, tab.label)
          )}
        </div>
      </div>
    </nav>
  );
};

export default Dock;
