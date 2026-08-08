import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DollarSign, Download, TrendingUp } from "lucide-react";
import type { AccountingExport, ExecutiveSnapshot, RentRollEntry, ResidentCharge } from "../../shared/contracts";
import { EmptyState } from "../components/EmptyState";
import { useProperty } from "../contexts/PropertyContext";
import { api } from "../lib/api";

export function FinancialPage() {
  const { property, propertyId } = useProperty();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"overview" | "rent-roll" | "charges" | "exports">("overview");
  const executive = useQuery({ queryKey: ["executive", propertyId], queryFn: () => api<{ executive: ExecutiveSnapshot }>(`/api/properties/${propertyId}/executive`), enabled: Boolean(propertyId) });
  const rentRoll = useQuery({ queryKey: ["rent-roll", propertyId], queryFn: () => api<{ rentRoll: RentRollEntry[] }>(`/api/properties/${propertyId}/rent-roll`), enabled: Boolean(propertyId) && tab === "rent-roll" });
  const charges = useQuery({ queryKey: ["charges", propertyId], queryFn: () => api<{ charges: ResidentCharge[] }>(`/api/properties/${propertyId}/charges`), enabled: Boolean(propertyId) && tab === "charges" });
  const exports = useQuery({ queryKey: ["accounting-exports", propertyId], queryFn: () => api<{ exports: AccountingExport[] }>(`/api/properties/${propertyId}/accounting-exports`), enabled: Boolean(propertyId) && tab === "exports" });
  const exportMutation = useMutation({
    mutationFn: () => {
      const today = new Date().toISOString().slice(0, 10);
      const start = new Date(); start.setDate(1);
      return api<{ export: AccountingExport }>("/api/accounting-exports", {
        method: "POST",
        body: JSON.stringify({ propertyId, exportType: "rent_roll", periodStart: start.toISOString().slice(0, 10), periodEnd: today }),
      });
    },
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ["accounting-exports", propertyId] }); },
  });

  const snap = executive.data?.executive;

  return <div className="page-stack">
    <section className="page-heading page-heading--hero dashboard-hero"><div><p className="eyebrow">{property?.name}</p><h1>Financial & back office</h1><p>Rent roll, resident charges, executive metrics, and accounting exports.</p></div>{propertyId && <a className="button button--secondary" href={`/api/properties/${propertyId}/rent-roll/export.csv`}><Download size={16} /> Export rent roll</a>}</section>
    <section className="toolbar"><div className="segmented-control">{(["overview", "rent-roll", "charges", "exports"] as const).map((value) => <button key={value} className={tab === value ? "active" : ""} onClick={() => setTab(value)}>{value.replace("-", " ")}</button>)}</div></section>
    {tab === "overview" && snap && <section className="metric-grid">
      {[
        { label: "Occupancy", value: `${snap.occupancyRate}%`, detail: `${snap.activeLeases} active leases` },
        { label: "Rent potential", value: `$${snap.monthlyRentPotential.toLocaleString()}`, detail: "Monthly contracted rent" },
        { label: "Pending charges", value: `$${snap.pendingCharges.toLocaleString()}`, detail: "Resident charges outstanding" },
        { label: "Pipeline", value: snap.prospectPipeline, detail: `${snap.toursThisWeek} tours this week` },
      ].map((stat) => <article className="metric-card metric-card--blue" key={stat.label}><span className="metric-card__icon"><TrendingUp size={20} /></span><div><small>{stat.label}</small><strong>{stat.value}</strong><p>{stat.detail}</p></div></article>)}
    </section>}
    {tab === "rent-roll" && <section className="panel table-panel">
      {rentRoll.data?.rentRoll.length ? <div className="data-table-wrap"><table className="data-table"><thead><tr><th>Unit</th><th>Household</th><th>Residents</th><th>Rent</th><th>Lease</th><th>Pending</th></tr></thead><tbody>
        {rentRoll.data.rentRoll.map((row) => <tr key={row.unitId}><td><span className="unit-number">{row.unitNumber}</span></td><td>{row.householdName ?? "—"}</td><td className="muted">{row.residentNames || "—"}</td><td>${row.monthlyRent.toLocaleString()}</td><td>{row.leaseStatus ?? row.occupancyStatus}</td><td>${row.pendingCharges.toLocaleString()}</td></tr>)}
      </tbody></table></div> : <EmptyState icon={DollarSign} title="No rent roll data" detail="Lease records drive the rent roll view." />}
    </section>}
    {tab === "charges" && <section className="panel table-panel">
      {charges.data?.charges.length ? <div className="data-table-wrap"><table className="data-table"><thead><tr><th>Description</th><th>Resident</th><th>Unit</th><th>Amount</th><th>Type</th><th>Status</th><th>Due</th></tr></thead><tbody>
        {charges.data.charges.map((charge) => <tr key={charge.id}><td>{charge.description}</td><td>{charge.residentName ?? "—"}</td><td>{charge.unitNumber ? `Unit ${charge.unitNumber}` : "—"}</td><td>${charge.amount.toLocaleString()}</td><td>{charge.chargeType}</td><td>{charge.status}</td><td>{charge.dueDate ?? "—"}</td></tr>)}
      </tbody></table></div> : <EmptyState icon={DollarSign} title="No resident charges" detail="Posted and pending charges will appear here." />}
    </section>}
    {tab === "exports" && <section className="panel table-panel">
      <header className="panel__heading"><div><p className="eyebrow">Accounting boundary</p><h2>Export history</h2></div><button className="button button--primary" disabled={exportMutation.isPending} onClick={() => void exportMutation.mutate()}>Generate rent roll export</button></header>
      {exports.data?.exports.length ? <div className="data-table-wrap"><table className="data-table"><thead><tr><th>Type</th><th>Period</th><th>Rows</th><th>Status</th><th>Created</th></tr></thead><tbody>
        {exports.data.exports.map((item) => <tr key={item.id}><td>{item.exportType.replaceAll("_", " ")}</td><td>{item.periodStart} → {item.periodEnd}</td><td>{item.rowCount}</td><td>{item.status}</td><td>{formatDate(item.createdAt)}</td></tr>)}
      </tbody></table></div> : <EmptyState icon={Download} title="No exports yet" detail="Accounting export snapshots will appear here." />}
    </section>}
  </div>;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}
