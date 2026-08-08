import { useQuery } from "@tanstack/react-query";
import { DollarSign, Mail, PawPrint, Wrench } from "lucide-react";
import type { PortalCharge, PortalSessionUser } from "../../../shared/contracts";
import {
  PortalEmptyState,
  PortalLoading,
  PortalPageHeader,
  PortalSectionHeading,
  PortalStatusBadge,
  PortalSurface,
} from "../../components/portal/PortalPrimitives";
import { PortalDocumentsHomeCard } from "./PortalDocumentsPage";
import { api } from "../../lib/api";
import { Link } from "../../lib/router";

export function PortalHomePage({ user }: { user: PortalSessionUser }) {
  return <div className="page-stack portal-page">
    <PortalPageHeader
      eyebrow={user.propertyName}
      title={`Welcome Home, ${user.name.split(" ")[0]}`}
      description={`${user.unitNumber ? `Unit ${user.unitNumber}` : "Your household account"}${user.leaseStatus ? ` · Lease ${user.leaseStatus.replaceAll("_", " ")}` : ""}. Everything you need is right here.`}
    />
    <PortalSectionHeading eyebrow="Your home" title="How Can We Help Today?" detail="Quick access to your most important resident services." />
    <section className="portal-action-grid">
      <Link className="portal-action-card portal-action-card--blue" to="/portal/maintenance"><span className="portal-action-card__icon"><Wrench size={20} /></span><div className="portal-action-card__body"><small>Maintenance</small><strong>Service Requests</strong><p>Submit and track work orders</p></div></Link>
      <Link className="portal-action-card portal-action-card--teal" to="/portal/messages"><span className="portal-action-card__icon"><Mail size={20} /></span><div className="portal-action-card__body"><small>Messages</small><strong>Community Inbox</strong><p>Announcements from your team</p></div></Link>
      <PortalDocumentsHomeCard />
      <Link className="portal-action-card portal-action-card--purple" to="/portal/pets"><span className="portal-action-card__icon"><PawPrint size={20} /></span><div className="portal-action-card__body"><small>Pets</small><strong>Household Pets</strong><p>View and update pet records</p></div></Link>
      <Link className="portal-action-card portal-action-card--green" to="/portal/charges"><span className="portal-action-card__icon"><DollarSign size={20} /></span><div className="portal-action-card__body"><small>Charges</small><strong>Balance & History</strong><p>View posted charges</p></div></Link>
    </section>
  </div>;
}

export function PortalChargesPage() {
  const query = useQuery({ queryKey: ["portal-charges"], queryFn: () => api<{ charges: PortalCharge[] }>("/api/portal/charges") });
  const pending = query.data?.charges.filter((item) => item.status !== "paid") ?? [];
  const paid = query.data?.charges.filter((item) => item.status === "paid") ?? [];
  const balance = pending.reduce((total, charge) => total + charge.amount, 0);

  return <div className="page-stack portal-page">
    <PortalPageHeader
      eyebrow="Account"
      title="Charges & History"
      description="A clear view of posted charges and activity for your household."
      compact
      action={query.data && <div className="portal-balance-summary"><small>Current balance</small><strong>${balance.toLocaleString()}</strong></div>}
    />
    {query.isPending ? <PortalLoading label="Loading charges" /> : query.isError ? <PortalEmptyState icon={DollarSign} title="Account Unavailable" detail="We could not load your charges right now. Please refresh and try again." /> : query.data?.charges.length ? <>
      {pending.length > 0 && <PortalSurface>
        <PortalSectionHeading eyebrow="Outstanding" title={`${pending.length} Charge${pending.length === 1 ? "" : "s"}`} detail="Items currently awaiting payment or review." />
        <ChargeTable charges={pending} />
      </PortalSurface>}
      {paid.length > 0 && <PortalSurface>
        <PortalSectionHeading eyebrow="Account history" title="Paid Charges" detail="Completed activity for your records." />
        <ChargeTable charges={paid} />
      </PortalSurface>}
    </> : <PortalEmptyState icon={DollarSign} title="Your Account Is Clear" detail="Posted rent and fee activity will appear here when available." />}
  </div>;
}

function ChargeTable({ charges }: { charges: PortalCharge[] }) {
  return <>
    <div className="data-table-wrap portal-charges-table"><table className="data-table"><thead><tr><th>Description</th><th>Amount</th><th>Status</th><th>Due</th></tr></thead><tbody>{charges.map((charge) => <tr key={charge.id}><td><strong>{charge.description}</strong></td><td>${charge.amount.toLocaleString()}</td><td><PortalStatusBadge value={charge.status} /></td><td>{charge.dueDate ?? "—"}</td></tr>)}</tbody></table></div>
    <div className="portal-charge-cards">{charges.map((charge) => <article key={charge.id} className="portal-charge-card"><div><strong>{charge.description}</strong><PortalStatusBadge value={charge.status} /></div><span>${charge.amount.toLocaleString()}</span><small>{charge.dueDate ? `Due ${charge.dueDate}` : "No due date"}</small></article>)}</div>
  </>;
}
