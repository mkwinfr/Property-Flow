import { useQuery } from "@tanstack/react-query";
import { FileText, FolderOpen, Home, ScrollText, Send } from "lucide-react";
import type { PortalApplicationStatus, PortalAttachment, PortalLeaseSummary } from "../../../shared/contracts";
import { PortalSubmissionPanel } from "../../components/PortalSubmissionPanel";
import {
  PortalEmptyState,
  PortalLoading,
  PortalPageHeader,
  PortalSectionHeading,
  PortalStatusBadge,
  PortalSurface,
  PortalTabs,
} from "../../components/portal/PortalPrimitives";
import { api } from "../../lib/api";
import { Link, useRouter } from "../../lib/router";

const tabs = [
  { id: "lease", label: "Lease", to: "/portal/documents/lease", icon: ScrollText },
  { id: "application", label: "Application", to: "/portal/documents/application", icon: FileText },
  { id: "uploads", label: "Send to office", to: "/portal/documents/uploads", icon: Send },
] as const;

type DocumentsTab = typeof tabs[number]["id"];

export function PortalDocumentsPage() {
  const { path } = useRouter();
  const tab = (path.match(/^\/portal\/documents\/(\w+)/)?.[1] ?? "lease") as DocumentsTab;
  const activeTab = tabs.some((item) => item.id === tab) ? tab : "lease";

  return <div className="page-stack portal-page">
    <PortalPageHeader
      eyebrow="Household records"
      title="Documents"
      description="Your lease, application progress, and a secure way to share files with the property team."
      compact
    />
    <div className="portal-documents-toolbar"><PortalTabs items={tabs} activeId={activeTab} label="Document sections" /></div>
    {activeTab === "lease" && <PortalLeaseTab />}
    {activeTab === "application" && <PortalApplicationTab />}
    {activeTab === "uploads" && <PortalSubmissionPanel />}
  </div>;
}

function PortalLeaseTab() {
  const query = useQuery({ queryKey: ["portal-lease"], queryFn: () => api<{ lease: PortalLeaseSummary | null }>("/api/portal/lease") });
  const documents = useQuery({
    queryKey: ["portal-lease-documents"],
    queryFn: () => api<{ documents: PortalAttachment[] }>("/api/portal/lease/documents"),
    enabled: Boolean(query.data?.lease),
  });
  const lease = query.data?.lease;

  if (query.isPending) return <PortalLoading label="Loading lease" />;
  if (query.isError) return <PortalEmptyState icon={ScrollText} title="Lease Unavailable" detail="We could not load your lease details. Please refresh and try again." />;
  if (!lease) {
    return <PortalEmptyState icon={Home} title="No Active Lease" detail="Lease details will appear here once your household lease is on file." />;
  }

  return <>
    <PortalSurface className="portal-detail-panel">
      <PortalSectionHeading eyebrow="Lease summary" title={`Unit ${lease.unitNumber}`} action={<PortalStatusBadge value={lease.status} />} />
      <dl className="legend-list portal-detail-list">
        <div><dt>Monthly rent</dt><dd>${lease.monthlyRent.toLocaleString()}</dd></div>
        <div><dt>Status</dt><dd>{lease.status.replaceAll("_", " ")}</dd></div>
        <div><dt>Term</dt><dd>{lease.startDate}{lease.endDate ? ` → ${lease.endDate}` : ""}</dd></div>
        {lease.moveInDate && <div><dt>Move-in date</dt><dd>{lease.moveInDate}</dd></div>}
      </dl>
    </PortalSurface>
    <PortalSurface className="portal-documents-panel">
      <PortalSectionHeading eyebrow="From management" title="Lease Documents" detail="Files shared with your household by the property team." />
      {documents.isPending ? <PortalLoading label="Loading lease documents" /> : documents.isError ? <PortalEmptyState icon={FileText} title="Documents Unavailable" detail="We could not load your lease documents. Please refresh and try again." /> : documents.data?.documents.length ? <div className="portal-document-list">
        {documents.data.documents.map((doc) => <a key={doc.id} className="portal-document-card" href={`/api/portal/attachments/${doc.id}/content`} target="_blank" rel="noreferrer">
          <FileText size={18} />
          <span><strong>{doc.originalName}</strong><small>{formatBytes(doc.sizeBytes)} · {formatDate(doc.createdAt)}</small></span>
        </a>)}
      </div> : <p className="notification-empty">No lease documents on file yet. Contact the office if you need a copy of your lease.</p>}
    </PortalSurface>
  </>;
}

function PortalApplicationTab() {
  const query = useQuery({ queryKey: ["portal-application"], queryFn: () => api<{ application: PortalApplicationStatus | null }>("/api/portal/application") });
  const app = query.data?.application;

  if (query.isPending) return <PortalLoading label="Loading application" />;
  if (query.isError) return <PortalEmptyState icon={FileText} title="Application Unavailable" detail="We could not load your application details. Please refresh and try again." />;
  if (!app) {
    return <PortalEmptyState icon={ScrollText} title="No Application on File" detail="If you applied before creating your portal account, contact the leasing office to link your application." />;
  }

  return <PortalSurface className="portal-detail-panel">
    <PortalSectionHeading eyebrow="Application progress" title="Your Application" action={<PortalStatusBadge value={app.status} />} />
    <dl className="legend-list portal-detail-list">
      <div><dt>Status</dt><dd>{app.status.replaceAll("_", " ")}</dd></div>
      <div><dt>Unit</dt><dd>{app.unitNumber ? `Unit ${app.unitNumber}` : "—"}</dd></div>
      <div><dt>Submitted</dt><dd>{formatDate(app.submittedAt)}</dd></div>
      {app.decisionAt && <div><dt>Decision date</dt><dd>{formatDate(app.decisionAt)}</dd></div>}
    </dl>
  </PortalSurface>;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

function formatBytes(value: number) {
  return value < 1024 ? `${value} B` : value < 1024 * 1024 ? `${(value / 1024).toFixed(1)} KB` : `${(value / 1024 / 1024).toFixed(1)} MB`;
}

export function PortalDocumentsHomeCard() {
  return <Link className="portal-action-card portal-action-card--amber" to="/portal/documents/lease">
    <span className="portal-action-card__icon"><FolderOpen size={20} /></span>
    <div className="portal-action-card__body"><small>Documents</small><strong>Lease & Uploads</strong><p>Files, application, and office submissions</p></div>
  </Link>;
}
