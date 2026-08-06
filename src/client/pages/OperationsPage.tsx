import { useRef, useState } from "react";
import { Boxes, ChevronLeft, ChevronRight, ClipboardPen, LayoutDashboard, PackageSearch, Store, Waves, Wrench } from "lucide-react";
import { useProperty } from "../contexts/PropertyContext";
import { InspectionsTab } from "../components/operations/InspectionsTab";
import { InventoryTab } from "../components/operations/InventoryTab";
import { OperationsOverview } from "../components/operations/OperationsOverview";
import { PoolLogsTab } from "../components/operations/PoolLogsTab";
import { VendorsTab } from "../components/operations/VendorsTab";
import { WorkOrdersTab } from "../components/operations/WorkOrdersTab";

type OperationsTab = "overview" | "work-orders" | "inspections" | "inventory" | "vendors" | "pool";
const tabs: Array<{ id: OperationsTab; label: string; icon: typeof Boxes }> = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "work-orders", label: "Work orders", icon: Wrench },
  { id: "inspections", label: "Inspections", icon: ClipboardPen },
  { id: "inventory", label: "Inventory", icon: PackageSearch },
  { id: "vendors", label: "Vendors", icon: Store },
  { id: "pool", label: "Pool logs", icon: Waves },
];

export function OperationsPage() {
  const { property } = useProperty();
  const requestedTab = new URLSearchParams(window.location.search).get("tab") as OperationsTab | null;
  const [tab, setTab] = useState<OperationsTab>(tabs.some((item) => item.id === requestedTab) ? requestedTab! : "overview");
  const tabStrip = useRef<HTMLElement>(null);
  const selectTab = (next: OperationsTab) => { setTab(next); window.history.replaceState({}, "", next === "overview" ? "/operations" : `/operations?tab=${next}`); };
  const scrollTabs = (direction: -1 | 1) => tabStrip.current?.scrollBy({ left: direction * 190, behavior: "smooth" });
  return <div className="page-stack operations-page">
    <section className="page-heading"><div><p className="eyebrow">{property?.name}</p><h1>Operations</h1><p>Maintenance, inspections, inventory, vendors, and compliance in one workspace.</p></div></section>
    <div className="section-tabs-shell"><button className="section-tabs-arrow section-tabs-arrow--left" onClick={() => scrollTabs(-1)} aria-label="Show previous operation sections"><ChevronLeft /></button><nav ref={tabStrip} className="section-tabs" aria-label="Operations sections">{tabs.map(({ icon: Icon, ...item }) => <button key={item.id} className={tab === item.id ? "active" : ""} onClick={() => selectTab(item.id)}><Icon size={16} />{item.label}</button>)}</nav><button className="section-tabs-arrow section-tabs-arrow--right" onClick={() => scrollTabs(1)} aria-label="Show more operation sections"><ChevronRight /></button></div>
    {tab === "overview" && <OperationsOverview onNavigate={selectTab} />}
    {tab === "work-orders" && <WorkOrdersTab />}
    {tab === "inspections" && <InspectionsTab />}
    {tab === "inventory" && <InventoryTab />}
    {tab === "vendors" && <VendorsTab />}
    {tab === "pool" && <PoolLogsTab />}
  </div>;
}
