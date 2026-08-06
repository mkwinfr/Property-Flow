import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, BriefcaseBusiness, Calendar, CheckCircle2, ChevronDown, ChevronRight, Circle, Clock3, DollarSign, Download, MapPin, PackagePlus, Pencil, Plus, ReceiptText, RotateCcw, Send, StickyNote, UserRoundCog, X } from "lucide-react";
import type { InventoryRecord, TurnBlockerCategory, TurnDetail, TurnItem, TurnItemStatus, TurnStatus, TurnVendorJob, TurnVendorJobStatus, VendorPaymentStatus, VendorRecord } from "../../shared/contracts";
import { DetailModal } from "./DetailModal";
import { AttachmentPanel } from "./AttachmentPanel";
import { ProgressBar } from "./ProgressBar";
import { PriorityBadge, StatusBadge } from "./StatusBadge";
import { api } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { AppSelect } from "./AppSelect";

const nextActions: Partial<Record<TurnStatus, Array<{ status: TurnStatus; label: string; icon: typeof Send }>>> = {
  planned: [{ status: "in_progress", label: "Start work", icon: Clock3 }],
  in_progress: [{ status: "ready_for_review", label: "Send for review", icon: Send }],
  rework: [{ status: "in_progress", label: "Resume work", icon: Clock3 }],
};

async function fetchMakeReadyPdf(turnId: string): Promise<{ blob: Blob; filename: string }> {
  const response = await fetch(`/api/turns/${turnId}/export.pdf`, { credentials: "same-origin" });
  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { error?: { message?: string } } | null;
    throw new Error(payload?.error?.message ?? "The PDF could not be generated");
  }
  const disposition = response.headers.get("Content-Disposition") ?? "";
  const filename = disposition.match(/filename="?([^";]+)"?/i)?.[1] ?? `make-ready-${turnId}.pdf`;
  return { blob: await response.blob(), filename };
}

function downloadPdf(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

async function openNativePdfActions(
  pdf: { blob: Blob; filename: string },
  turn: TurnDetail,
  text: string,
): Promise<boolean> {
  if (typeof navigator.share !== "function" || typeof navigator.canShare !== "function") return false;
  const file = new File([pdf.blob], pdf.filename, { type: "application/pdf" });
  if (!navigator.canShare({ files: [file] })) return false;
  await navigator.share({
    files: [file],
    title: `Completed Make Ready - Unit ${turn.unitNumber}`,
    text,
  });
  return true;
}

export function TurnDetailPanel({ turnId, onClose }: { turnId: string | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { can } = useAuth();
  const [error, setError] = useState("");
  const [itemEditor, setItemEditor] = useState<TurnItem | "new" | null>(null);
  const [reworkItem, setReworkItem] = useState<TurnItem | null>(null);
  const [resolvingBlocker, setResolvingBlocker] = useState<TurnItem | null>(null);
  const [pdfAction, setPdfAction] = useState<"save" | "share" | null>(null);
  const [activityOpen, setActivityOpen] = useState(false);
  const [expandedAreas, setExpandedAreas] = useState<Set<string>>(() => new Set());
  const query = useQuery({ queryKey: ["turn", turnId], queryFn: () => api<{ turn: TurnDetail }>(`/api/turns/${turnId}`), enabled: Boolean(turnId) });
  const turn = query.data?.turn;
  const groups = useMemo(() => {
    const result = new Map<string, NonNullable<typeof turn>["items"]>();
    for (const item of turn?.items ?? []) result.set(item.area, [...(result.get(item.area) ?? []), item]);
    return [...result.entries()];
  }, [turn]);
  useEffect(() => { setExpandedAreas(new Set()); setActivityOpen(false); }, [turnId]);
  const toggleArea = (area: string) => setExpandedAreas((current) => {
    const next = new Set(current);
    if (next.has(area)) next.delete(area); else next.add(area);
    return next;
  });
  const refresh = async (updated: TurnDetail) => {
    queryClient.setQueryData(["turn", turnId], { turn: updated });
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["turns", turn?.propertyId] }),
      queryClient.invalidateQueries({ queryKey: ["dashboard", turn?.propertyId] }),
      queryClient.invalidateQueries({ queryKey: ["my-work", turn?.propertyId] }),
      queryClient.invalidateQueries({ queryKey: ["team-workload", turn?.propertyId] }),
      queryClient.invalidateQueries({ queryKey: ["turn-blockers", turn?.propertyId] }),
    ]);
  };
  const itemMutation = useMutation({
    mutationFn: ({ itemId, patch }: { itemId: string; patch: { status?: TurnItemStatus; area?: string; category?: string; title?: string; notes?: string | null; blockedReason?: string | null } }) =>
      api<{ turn: TurnDetail }>(`/api/turns/${turnId}/items/${itemId}`, { method: "PATCH", body: JSON.stringify(patch) }),
    onSuccess: ({ turn: updated }) => void refresh(updated),
  });
  const transitionMutation = useMutation({ mutationFn: (status: TurnStatus) => api<{ turn: TurnDetail }>(`/api/turns/${turnId}/transitions`, { method: "POST", body: JSON.stringify({ status }) }), onSuccess: ({ turn: updated }) => void refresh(updated) });
  const reviewMutation = useMutation({ mutationFn: ({ itemId, decision, notes }: { itemId: string; decision: "passed" | "rework"; notes?: string | null }) => api<{ turn: TurnDetail }>(`/api/turns/${turnId}/items/${itemId}/review`, { method: "POST", body: JSON.stringify({ decision, notes: notes ?? null }) }), onSuccess: ({ turn: updated }) => { setError(""); void refresh(updated); }, onError: (reason) => setError(reason instanceof Error ? reason.message : "The review decision could not be saved") });
  if (!turnId) return null;
  const transition = async (status: TurnStatus) => { setError(""); try { await transitionMutation.mutateAsync(status); } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not update turn"); } };
  const savePdf = async () => {
    if (!turn) return;
    setError(""); setPdfAction("save");
    try {
      const pdf = await fetchMakeReadyPdf(turn.id);
      const handledNatively = await openNativePdfActions(
        pdf,
        turn,
        `Save the completed Make Ready record for Unit ${turn.unitNumber} to Files.`,
      );
      if (!handledNatively) downloadPdf(pdf.blob, pdf.filename);
    } catch (reason) {
      if (reason instanceof DOMException && reason.name === "AbortError") return;
      setError(reason instanceof Error ? reason.message : "The PDF could not be saved");
    } finally {
      setPdfAction(null);
    }
  };
  const sharePdf = async () => {
    if (!turn) return;
    setError(""); setPdfAction("share");
    try {
      const pdf = await fetchMakeReadyPdf(turn.id);
      const handledNatively = await openNativePdfActions(
        pdf,
        turn,
        `Completed Make Ready record for Unit ${turn.unitNumber}`,
      );
      if (!handledNatively) {
        downloadPdf(pdf.blob, pdf.filename);
        setError("This device does not support file sharing, so the PDF was downloaded instead.");
      }
    } catch (reason) {
      if (reason instanceof DOMException && reason.name === "AbortError") return;
      setError(reason instanceof Error ? reason.message : "The PDF could not be shared");
    } finally {
      setPdfAction(null);
    }
  };
  const reviewCounts = turn ? {
    pending: turn.items.filter((item) => item.status === "complete" && item.reviewStatus === "pending").length,
    passed: turn.items.filter((item) => item.status === "complete" && item.reviewStatus === "passed").length,
    rework: turn.items.filter((item) => item.status === "complete" && item.reviewStatus === "rework").length,
  } : { pending: 0, passed: 0, rework: 0 };

  return <>
    <DetailModal eyebrow="Make Ready" title={`Unit ${turn?.unitNumber ?? "…"}`} icon={Calendar} labelledBy="turn-detail-title" onClose={onClose} className="turn-detail-modal">
      {!turn ? <div className="page-loading"><span /><span /><span /></div> : <div className="turn-detail-layout">
        <div className="turn-detail-main">
          <section className="turn-hero"><div className="turn-hero__top"><div className="turn-hero__badges"><StatusBadge status={turn.status} /><PriorityBadge priority={turn.priority} /></div><button className="turn-activity-button" onClick={() => setActivityOpen(true)}><Clock3 />Activity <b>{turn.activity.length}</b></button></div><p><MapPin size={15} /> {turn.buildingName} · {turn.floorPlanName}</p><div className="turn-dates"><span><small>Move out</small><strong>{formatDate(turn.moveOutDate)}</strong></span><span><small>Target ready</small><strong>{formatDate(turn.targetReadyDate)}</strong></span></div><div className="progress-line"><ProgressBar complete={turn.completedItems} total={turn.totalItems} /><strong>{turn.completedItems}/{turn.totalItems}</strong></div></section>
          {error && <p className="form-error drawer-error">{error}</p>}
          {can("turns:update") && nextActions[turn.status] && <section className="drawer-actions">{nextActions[turn.status]!.filter((action) => !["complete", "rework"].includes(action.status) || can("turns:review")).map(({ icon: Icon, ...action }) => <button key={action.status} className={action.status === "rework" ? "button button--secondary" : "button button--primary"} onClick={() => void transition(action.status)} disabled={transitionMutation.isPending}><Icon size={16} />{action.label}</button>)}</section>}
          {turn.status === "ready_for_review" && can("turns:review") && <section className="review-round-actions"><div><span>Review round {turn.reviewRound}</span><strong>{reviewCounts.passed} passed · {reviewCounts.pending} pending · {reviewCounts.rework} rework</strong></div><div>{reviewCounts.rework > 0 && <button className="button button--secondary" disabled={reviewCounts.pending > 0 || transitionMutation.isPending} onClick={() => void transition("rework")}><RotateCcw size={16} />Send rework</button>}<button className="button button--primary" disabled={reviewCounts.pending > 0 || reviewCounts.rework > 0 || transitionMutation.isPending} onClick={() => void transition("complete")}><CheckCircle2 size={16} />Approve Make Ready</button></div></section>}
          {turn.status === "complete" && turn.approvedAt && <section className="review-round-actions review-round-actions--approved"><div><span>Manager approval</span><strong>Approved by {turn.approvedByName ?? "Property manager"} · {new Date(turn.approvedAt).toLocaleString()}</strong></div><span className="completed-record-actions"><CheckCircle2 size={22} />{can("turns:review") && <span className="completed-record-actions__buttons"><button type="button" className="button button--small button--secondary" onClick={() => void savePdf()} disabled={pdfAction !== null}><Download />{pdfAction === "save" ? "Preparing…" : "Save to device"}</button><button type="button" className="button button--small button--secondary" onClick={() => void sharePdf()} disabled={pdfAction !== null}><Send />{pdfAction === "share" ? "Preparing…" : "Share / email"}</button></span>}</span></section>}
          <section className={`checklist-section ${turn.status === "ready_for_review" ? "checklist-section--review" : ""}`}>
            <div className="section-title"><div><p className="eyebrow">Shared work scope</p><h3>Make Ready checklist</h3></div><span className="section-title-actions"><b>{turn.totalItems ? Math.round((turn.completedItems / turn.totalItems) * 100) : 0}%</b>{can("turns:update") && !["complete", "cancelled", "ready_for_review", "rework"].includes(turn.status) && <button className="button button--small button--secondary" onClick={() => setItemEditor("new")}><Plus />Add scope</button>}</span></div>
            {groups.map(([area, items]) => {
              const expanded = expandedAreas.has(area);
              const findingCount = items.filter((item) => shouldHighlightInspectionFinding(turn.status, item)).length;
              const noteCount = items.filter((item) => shouldHighlightScopeNote(turn.status, item)).length;
              return <div className={`checklist-group${findingCount ? " checklist-group--has-findings" : ""}${noteCount ? " checklist-group--has-notes" : ""}`} key={area}>
                <button type="button" className="checklist-group__toggle" aria-expanded={expanded} onClick={() => toggleArea(area)}>
                  <span>{expanded ? <ChevronDown /> : <ChevronRight />}<strong>{area}</strong></span>
                  <span>{findingCount > 0 && <em><AlertTriangle />{findingCount} need attention</em>}{noteCount > 0 && <em className="scope-note-count"><StickyNote />{noteCount} with notes</em>}<small>{items.filter((item) => ["complete", "not_applicable"].includes(item.status)).length}/{items.length}</small></span>
                </button>
                {expanded && items.map((item) => <div className={`check-item check-item--${item.status}${shouldHighlightInspectionFinding(turn.status, item) ? " check-item--inspection-finding" : ""}${shouldHighlightScopeNote(turn.status, item) ? " check-item--scope-note" : ""}`} key={item.id}>
              <button type="button" aria-label={`${item.status === "complete" ? "Reopen" : "Complete"} ${item.title}`} disabled={!can("turns:update") || itemMutation.isPending || ["ready_for_review", "rework"].includes(turn.status) || item.reviewStatus === "passed"} onClick={() => itemMutation.mutate({ itemId: item.id, patch: { status: item.status === "complete" ? "open" : item.status === "not_applicable" ? "open" : "complete" } })}>{["complete", "not_applicable"].includes(item.status) ? <CheckCircle2 /> : <Circle />}</button>
              <span><strong>{item.title}</strong><small>{item.category}{item.inspectionCondition ? ` · Inspection: ${item.inspectionCondition}` : ""}{item.notes ? ` · ${item.notes}` : ""}</small>{item.blockedReason && <small className="scope-blocked-reason">Blocked: {item.blockedReason}</small>}{item.completedAt && <small>Completed {new Date(item.completedAt).toLocaleString()}{item.completedByName ? ` by ${item.completedByName}` : ""}</small>}{item.reviewStatus && <small className={`review-note review-note--${item.reviewStatus}`}>Round {item.reviewStatus === "pending" ? turn.reviewRound : (item.reviews[0]?.reviewRound ?? turn.reviewRound)}: {item.reviewStatus}{item.reviewNotes ? ` · ${item.reviewNotes}` : ""}</small>}{item.reviews.length > 1 && <small>{item.reviews.length} review decisions retained</small>}</span>
              {shouldHighlightInspectionFinding(turn.status, item) && <em className="scope-inspection-finding"><AlertTriangle />Inspection finding</em>}{shouldHighlightScopeNote(turn.status, item) && <em className="scope-note-indicator"><StickyNote />Scope note</em>}{item.origin === "make_ready" && <em>Added during Make Ready</em>}{item.status === "not_applicable" && <em className="scope-no-work">No work required</em>}{item.status === "in_progress" && <em>In progress</em>}{item.status === "blocked" && <em>Blocked</em>}{item.materials.length > 0 && <em className="scope-material-summary"><PackagePlus />{item.materials.length} material{item.materials.length === 1 ? "" : "s"}{item.materialCost !== null ? ` · $${item.materialCost.toFixed(2)}` : ""}</em>}{item.attachmentCount > 0 && <em>{item.attachmentCount} file{item.attachmentCount === 1 ? "" : "s"}</em>}
              {item.status === "blocked" && item.blocker && can("turns:update") && !["complete", "cancelled", "ready_for_review", "rework"].includes(turn.status) && <button type="button" className="button button--small button--secondary resolve-blocker-button" onClick={() => setResolvingBlocker(item)}><CheckCircle2 />Resolve</button>}
              {turn.status === "ready_for_review" && item.status === "complete" && can("turns:review") && item.reviewStatus === "pending" && <span className="item-review-controls"><button className="review-pass" disabled={reviewMutation.isPending} onClick={() => reviewMutation.mutate({ itemId: item.id, decision: "passed" })}>Pass</button><button className="review-rework" disabled={reviewMutation.isPending} onClick={() => setReworkItem(item)}>Rework</button></span>}
              {can("turns:update") && !["complete", "cancelled", "ready_for_review", "rework"].includes(turn.status) && item.reviewStatus !== "passed" && <button type="button" className="icon-button check-item__edit" aria-label={`Edit ${item.title}`} onClick={() => setItemEditor(item)}><Pencil /></button>}
                </div>)}
              </div>;
            })}
          </section>
        </div>
        <aside className="turn-activity-column">{can("turns:review") && <CostSummaryPanel turn={turn} canUpload={can("turns:update") && !["complete", "cancelled"].includes(turn.status)} />}<ExecutionPanel turn={turn} canUpdate={can("turns:review") && can("turns:update") && !["complete", "cancelled"].includes(turn.status)} canViewVendors={can("vendors:view")} onSaved={refresh} /></aside>
      </div>}
    </DetailModal>
    {turn && activityOpen && <ActivityHistoryDialog turn={turn} onClose={() => setActivityOpen(false)} />}
    {turn && itemEditor && <TurnItemEditor turn={turn} item={itemEditor === "new" ? null : (turn.items.find((item) => item.id === itemEditor.id) ?? itemEditor)} onClose={() => setItemEditor(null)} onSaved={async (updated) => { await refresh(updated); setItemEditor(null); }} onTurnChanged={refresh} onAttachmentChanged={() => queryClient.invalidateQueries({ queryKey: ["turn", turnId] })} />}
    {turn && reworkItem && <ReworkDecisionDialog item={reworkItem} pending={reviewMutation.isPending} onClose={() => setReworkItem(null)} onSubmit={async (notes) => { await reviewMutation.mutateAsync({ itemId: reworkItem.id, decision: "rework", notes }); setReworkItem(null); }} />}
    {turn && resolvingBlocker && <BlockerResolutionDialog turn={turn} item={resolvingBlocker} onClose={() => setResolvingBlocker(null)} onSaved={async (updated) => { await refresh(updated); setResolvingBlocker(null); }} />}
  </>;
}

function ActivityHistoryDialog({ turn, onClose }: { turn: TurnDetail; onClose: () => void }) {
  useEffect(() => { const close = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); }; window.addEventListener("keydown", close); return () => window.removeEventListener("keydown", close); }, [onClose]);
  return <div className="modal-layer modal-layer--nested"><section className="dialog dialog--compact activity-history-dialog" role="dialog" aria-modal="true" aria-labelledby="activity-history-title"><header className="dialog__header"><span className="dialog__icon"><Clock3 /></span><div><p className="eyebrow">Make Ready record</p><h2 id="activity-history-title">Activity history</h2></div><button className="icon-button dialog__close" onClick={onClose} aria-label="Close activity history"><X /></button></header><div className="activity-history-list">{turn.activity.length ? turn.activity.map((event) => <article className="activity-history-item" key={event.id}><i /><span><strong>{event.action.replaceAll(".", " ")}</strong><p>{event.actorName ?? "System"}</p><small>{new Date(event.createdAt).toLocaleString()}</small></span></article>) : <p className="notification-empty">No activity has been recorded yet.</p>}</div></section></div>;
}

export function BlockerResolutionDialog({ turn, item, onClose, onSaved }: { turn: TurnDetail; item: TurnItem; onClose: () => void; onSaved: (turn: TurnDetail) => void | Promise<void> }) {
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const mutation = useMutation({
    mutationFn: () => api<{ turn: TurnDetail }>(`/api/turns/${turn.id}/items/${item.id}/blocker/resolve`, {
      method: "POST", body: JSON.stringify({ resolutionNotes: notes.trim() }),
    }),
    onSuccess: ({ turn: updated }) => onSaved(updated),
  });
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setError("");
    try { await mutation.mutateAsync(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "The blocker could not be resolved"); }
  };
  return <div className="modal-layer modal-layer--nested"><section className="dialog dialog--compact" role="dialog" aria-modal="true" aria-labelledby="resolve-blocker-title"><header className="dialog__header"><span className="dialog__icon"><CheckCircle2 /></span><div><p className="eyebrow">Blocked work</p><h2 id="resolve-blocker-title">Resolve blocker</h2></div><button className="icon-button" onClick={onClose}><X /></button></header><form onSubmit={submit}><p className="form-context"><strong>{item.title}</strong><br />{item.blocker?.reason ?? item.blockedReason}<br />Resolving this blocker moves the scope item back to In progress.</p><div className="form-grid"><label className="field field--full"><span>What cleared the blocker?</span><textarea autoFocus required minLength={2} rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Part arrived, access was provided, approval received…" /></label></div>{error && <p className="form-error">{error}</p>}<footer className="dialog__footer"><button type="button" className="button button--ghost" onClick={onClose}>Cancel</button><button className="button button--primary" disabled={mutation.isPending || notes.trim().length < 2}>{mutation.isPending ? "Resolving…" : "Resolve and resume"}</button></footer></form></section></div>;
}

function ReworkDecisionDialog({ item, pending, onClose, onSubmit }: { item: TurnItem; pending: boolean; onClose: () => void; onSubmit: (notes: string) => void | Promise<void> }) {
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    try { await onSubmit(notes.trim()); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "The rework decision could not be saved"); }
  };
  return <div className="modal-layer modal-layer--nested"><section className="dialog dialog--compact" role="dialog" aria-modal="true" aria-labelledby="rework-decision-title"><header className="dialog__header"><span className="dialog__icon dialog__icon--warning"><RotateCcw /></span><div><p className="eyebrow">Quality review</p><h2 id="rework-decision-title">Request rework</h2></div><button className="icon-button" onClick={onClose}><X /></button></header><form onSubmit={submit}><p className="form-context"><strong>{item.title}</strong><br />The lead technician will retain ownership when this work item is reopened.</p><div className="form-grid"><label className="field field--full"><span>Why does this need rework?</span><textarea autoFocus required rows={4} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Describe what did not pass and what must be corrected." /></label></div>{error && <p className="form-error">{error}</p>}<footer className="dialog__footer"><button type="button" className="button button--ghost" onClick={onClose}>Cancel</button><button className="button button--secondary" disabled={pending || !notes.trim()}>{pending ? "Saving…" : "Mark for rework"}</button></footer></form></section></div>;
}

function TurnItemEditor({ turn, item, onClose, onSaved, onTurnChanged, onAttachmentChanged }: { turn: TurnDetail; item: TurnItem | null; onClose: () => void; onSaved: (turn: TurnDetail) => void | Promise<void>; onTurnChanged: (turn: TurnDetail) => void | Promise<void>; onAttachmentChanged: () => void | Promise<void> }) {
  const [form, setForm] = useState({ area: item?.area ?? "", category: item?.category ?? "", title: item?.title ?? "", notes: item?.notes ?? "", status: item?.status ?? "open" as TurnItemStatus, blockedReason: item?.blockedReason ?? "", blockerCategory: item?.blocker?.category ?? "other" as TurnBlockerCategory, responsibleParty: item?.blocker?.responsibleParty ?? "", expectedResolutionDate: item?.blocker?.expectedResolutionDate ?? "" });
  const [error, setError] = useState("");
  const mutation = useMutation({
    mutationFn: () => api<{ turn: TurnDetail }>(item ? `/api/turns/${turn.id}/items/${item.id}` : `/api/turns/${turn.id}/items`, {
      method: item ? "PATCH" : "POST",
      body: JSON.stringify({ ...form, notes: form.notes.trim() || null, blockedReason: form.status === "blocked" ? form.blockedReason.trim() || null : null, responsibleParty: form.status === "blocked" ? form.responsibleParty.trim() || null : undefined, expectedResolutionDate: form.status === "blocked" ? form.expectedResolutionDate || null : undefined }),
    }),
    onSuccess: ({ turn: updated }) => onSaved(updated),
  });
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    try { await mutation.mutateAsync(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Scope item could not be saved"); }
  };
  return <div className="modal-layer modal-layer--nested"><section className="dialog dialog--compact scope-item-dialog" role="dialog" aria-modal="true" aria-labelledby="turn-item-editor-title"><header className="dialog__header"><span className="dialog__icon"><Pencil /></span><div><p className="eyebrow">Make Ready scope</p><h2 id="turn-item-editor-title">{item ? "Update work item" : "Add work item"}</h2></div><button className="icon-button" onClick={onClose}><X /></button></header><form onSubmit={submit}><div className="form-grid"><label className="field"><span>Area</span><input required value={form.area} onChange={(event) => setForm({ ...form, area: event.target.value })} placeholder="Kitchen" /></label><label className="field"><span>Category</span><input required value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} placeholder="Plumbing" /></label><label className="field field--full"><span>Work item</span><input required minLength={2} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></label>{item && <label className="field field--full"><span>Work status</span><AppSelect ariaLabel="Work status" value={form.status} onChange={(value) => setForm({ ...form, status: value as TurnItemStatus })} options={["open", "in_progress", "blocked", "complete", "not_applicable"].map((status) => ({ value: status, label: status.replaceAll("_", " ") }))} /></label>}{form.status === "blocked" && <><label className="field"><span>Blocker type</span><AppSelect ariaLabel="Blocker type" value={form.blockerCategory} onChange={(value) => setForm({ ...form, blockerCategory: value as TurnBlockerCategory })} options={["material", "vendor", "access", "approval", "scheduling", "other"].map((value) => ({ value, label: value }))} /></label><label className="field"><span>Expected resolution</span><input type="date" value={form.expectedResolutionDate} onChange={(event) => setForm({ ...form, expectedResolutionDate: event.target.value })} /></label><label className="field field--full"><span>What is blocking this work?</span><textarea required rows={2} value={form.blockedReason} onChange={(event) => setForm({ ...form, blockedReason: event.target.value })} placeholder="Waiting on a part, access, approval, or outside service…" /></label><label className="field field--full"><span>Who can clear it?</span><input value={form.responsibleParty} onChange={(event) => setForm({ ...form, responsibleParty: event.target.value })} placeholder="Maintenance manager, leasing, vendor name…" /></label></>}<label className="field field--full"><span>Notes</span><textarea rows={3} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></label></div>{item?.sourceInspectionItemId && <p className="form-context"><strong>Editable Make Ready copy</strong><br />The completed inspection remains locked. {item.status === "not_applicable" ? "Change the work status to Open, then update the task or notes to capture newly discovered work." : "Changes here affect only this Make Ready item."}</p>}{error && <p className="form-error">{error}</p>}<footer className="dialog__footer"><button type="button" className="button button--ghost" onClick={onClose}>Cancel</button><button className="button button--primary" disabled={mutation.isPending}>{mutation.isPending ? "Saving…" : "Save scope item"}</button></footer></form>{item && <MaterialUsagePanel turn={turn} item={item} onChanged={onTurnChanged} />}{item && <AttachmentPanel propertyId={turn.propertyId} entityType="turn_item" entityId={item.id} canUpload={!['complete','cancelled'].includes(turn.status)} onChanged={onAttachmentChanged} />}</section></div>;
}

function MaterialUsagePanel({ turn, item, onChanged }: { turn: TurnDetail; item: TurnItem; onChanged: (turn: TurnDetail) => void | Promise<void> }) {
  const { can } = useAuth();
  const queryClient = useQueryClient();
  const [selection, setSelection] = useState({ inventoryItemId: "", quantity: "1" });
  const [error, setError] = useState("");
  const inventory = useQuery({
    queryKey: ["inventory", turn.propertyId],
    queryFn: () => api<{ inventory: InventoryRecord[] }>(`/api/properties/${turn.propertyId}/inventory`),
    enabled: can("inventory:view"),
  });
  const categorized = useMemo(() => {
    const records = inventory.data?.inventory ?? [];
    return {
      matches: records.filter((record) => categoriesMatch(item.category, record.category)),
      other: records.filter((record) => !categoriesMatch(item.category, record.category)),
    };
  }, [inventory.data?.inventory, item.category]);
  const canChange = can("turns:update") && can("inventory:manage") && turn.status === "in_progress" && item.status !== "not_applicable" && item.reviewStatus !== "passed";
  const refreshInventory = async (updated: TurnDetail) => {
    await onChanged(updated);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["inventory", turn.propertyId] }),
      queryClient.invalidateQueries({ queryKey: ["operations", turn.propertyId] }),
    ]);
  };
  const addMutation = useMutation({
    mutationFn: () => api<{ turn: TurnDetail }>(`/api/turns/${turn.id}/items/${item.id}/materials`, {
      method: "POST",
      body: JSON.stringify({ inventoryItemId: selection.inventoryItemId, quantity: Number(selection.quantity) }),
    }),
    onSuccess: async ({ turn: updated }) => {
      setError("");
      setSelection({ inventoryItemId: "", quantity: "1" });
      await refreshInventory(updated);
    },
  });
  const reverseMutation = useMutation({
    mutationFn: (usageId: string) => api<{ turn: TurnDetail }>(`/api/turns/${turn.id}/items/${item.id}/materials/${usageId}/reverse`, { method: "POST" }),
    onSuccess: async ({ turn: updated }) => { setError(""); await refreshInventory(updated); },
  });
  const add = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    try { await addMutation.mutateAsync(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Material usage could not be recorded"); }
  };
  const reverse = async (usageId: string) => {
    setError("");
    try { await reverseMutation.mutateAsync(usageId); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Material usage could not be corrected"); }
  };
  if (!can("inventory:view")) return null;
  return <section className="scope-materials">
    <header><div><p className="eyebrow">Inventory usage</p><h3>Materials used</h3></div>{item.materialCost !== null && <span><strong>${item.materialCost.toFixed(2)}</strong><small>material cost</small></span>}</header>
    {item.materials.length > 0 ? <div className="scope-material-list">{item.materials.map((usage) => <article key={usage.id}>
      <span><PackagePlus /><span><strong>{usage.name}</strong><small>{formatQuantity(usage.quantity)} used · {usage.sku}{usage.totalCost !== null ? ` · $${usage.totalCost.toFixed(2)}` : ""}</small></span></span>
      {canChange && <button type="button" className="text-button text-button--danger" disabled={reverseMutation.isPending} onClick={() => void reverse(usage.id)}><RotateCcw />Remove</button>}
    </article>)}</div> : <p className="scope-material-empty">No inventory has been used for this scope item.</p>}
    {canChange ? <form className="scope-material-form" onSubmit={add}>
      <label className="field field--full"><span>Material</span><AppSelect required searchable ariaLabel="Material" value={selection.inventoryItemId} onChange={(value) => setSelection({ ...selection, inventoryItemId: value })} options={[{ value: "", label: "Select inventory" }, ...categorized.matches.map((record) => ({ value: record.id, label: `${record.name} · ${formatQuantity(record.quantityOnHand)} on hand`, disabled: record.quantityOnHand <= 0, group: `${item.category} matches` })), ...categorized.other.map((record) => ({ value: record.id, label: `${record.name} · ${record.category} · ${formatQuantity(record.quantityOnHand)} on hand`, disabled: record.quantityOnHand <= 0, group: "Other inventory" }))]} /></label>
      <label className="field"><span>Quantity used</span><input required type="number" min="0.01" max="10000" step="0.01" value={selection.quantity} onChange={(event) => setSelection({ ...selection, quantity: event.target.value })} /></label>
      <button className="button button--small button--secondary" disabled={addMutation.isPending || !selection.inventoryItemId || Number(selection.quantity) <= 0}><PackagePlus />{addMutation.isPending ? "Recording…" : "Add material"}</button>
    </form> : <p className="scope-material-guidance">{turn.status === "planned" ? "Start the Make Ready before recording materials." : turn.status !== "in_progress" ? "Material usage is locked outside active work." : item.status === "not_applicable" ? "Reopen this scope item before recording materials." : "Material usage is locked for this item."}</p>}
    {error && <p className="form-error">{error}</p>}
    {canChange && <small className="scope-material-audit-note">Removing a line restores stock and retains a correcting ledger entry.</small>}
  </section>;
}

function CostSummaryPanel({ turn, canUpload }: { turn: TurnDetail; canUpload: boolean }) {
  if (!turn.costSummary) return null;
  const summary = turn.costSummary;
  return <section className="turn-cost-section"><div className="section-title"><div><p className="eyebrow">Financial review</p><h3>Make Ready cost</h3></div><DollarSign size={18} /></div>
    <div className="turn-cost-total"><span><small>Gross cost</small><strong>{formatMoney(summary.grossCost)}</strong></span><ReceiptText /></div>
    <div className="turn-cost-breakdown"><span>Materials<strong>{formatMoney(summary.materialCost)}</strong></span><span>Vendor commitments<strong>{formatMoney(summary.vendorCost)}</strong></span><span>Estimated resident charge<strong>{formatMoney(summary.estimatedResidentCharge)}</strong></span><span className="turn-cost-property">Projected property expense<strong>{formatMoney(summary.projectedPropertyExpense)}</strong></span></div>
    <p className="turn-cost-guidance">Vendor cost uses the final invoice when available, otherwise the approved amount or quote. Resident charges remain estimates from the locked inspection.</p>
    {summary.lowStockItems.length > 0 && <div className="turn-low-stock"><strong><AlertTriangle />Reorder attention</strong>{summary.lowStockItems.map((item) => <span key={item.inventoryItemId}>{item.name}<small>{formatQuantity(item.quantityOnHand)} on hand · reorder at {formatQuantity(item.reorderLevel)}{item.activeReorderStatus ? ` · ${item.activeReorderStatus}` : ""}</small></span>)}</div>}
    <AttachmentPanel propertyId={turn.propertyId} entityType="turn" entityId={turn.id} canUpload={canUpload} />
  </section>;
}

function ExecutionPanel({ turn, canUpdate, canViewVendors, onSaved }: { turn: TurnDetail; canUpdate: boolean; canViewVendors: boolean; onSaved: (turn: TurnDetail) => void | Promise<void> }) {
  const [form, setForm] = useState({ leadTechnicianUserId: turn.leadTechnicianUserId ?? "", targetReadyDate: turn.targetReadyDate ?? "", priority: turn.priority });
  const [vendorEditor, setVendorEditor] = useState<TurnVendorJob | "new" | null>(null);
  const [error, setError] = useState("");
  useEffect(() => setForm({ leadTechnicianUserId: turn.leadTechnicianUserId ?? "", targetReadyDate: turn.targetReadyDate ?? "", priority: turn.priority }), [turn.leadTechnicianUserId, turn.targetReadyDate, turn.priority]);
  const team = useQuery({ queryKey: ["team", turn.propertyId], queryFn: () => api<{ team: Array<{ id: string; name: string; roles: string }> }>(`/api/properties/${turn.propertyId}/team`), enabled: canUpdate });
  const vendors = useQuery({ queryKey: ["vendors", turn.propertyId], queryFn: () => api<{ vendors: VendorRecord[] }>(`/api/properties/${turn.propertyId}/vendors`), enabled: canUpdate && canViewVendors });
  const mutation = useMutation({ mutationFn: () => api<{ turn: TurnDetail }>(`/api/turns/${turn.id}`, { method: "PATCH", body: JSON.stringify({ ...form, leadTechnicianUserId: form.leadTechnicianUserId || null, targetReadyDate: form.targetReadyDate || null }) }), onSuccess: ({ turn: updated }) => onSaved(updated) });
  const vendorStatusMutation = useMutation({ mutationFn: ({ id, status }: { id: string; status: TurnVendorJobStatus }) => api<{ turn: TurnDetail }>(`/api/turns/${turn.id}/vendor-jobs/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }), onSuccess: ({ turn: updated }) => onSaved(updated) });
  const save = async (event: FormEvent) => { event.preventDefault(); setError(""); try { await mutation.mutateAsync(); } catch (reason) { setError(reason instanceof Error ? reason.message : "Execution details could not be saved"); } };
  return <>
    <section className="execution-section"><div className="section-title"><div><p className="eyebrow">Ownership</p><h3>Make Ready lead</h3></div><UserRoundCog size={18} /></div>{canUpdate ? <form onSubmit={save}><label className="field"><span>Lead technician</span><AppSelect searchable ariaLabel="Lead technician" value={form.leadTechnicianUserId} onChange={(value) => setForm({ ...form, leadTechnicianUserId: value })} options={[{ value: "", label: "Unassigned" }, ...(team.data?.team.map((person) => ({ value: person.id, label: `${person.name} · ${person.roles}` })) ?? [])]} /></label><label className="field"><span>Target ready</span><input type="date" value={form.targetReadyDate} onChange={(event) => setForm({ ...form, targetReadyDate: event.target.value })} /></label><label className="field"><span>Priority</span><AppSelect ariaLabel="Priority" value={form.priority} onChange={(value) => setForm({ ...form, priority: value as typeof form.priority })} options={["low", "normal", "high", "urgent"].map((value) => ({ value, label: value }))} /></label>{error && <p className="form-error">{error}</p>}<button className="button button--small button--primary" disabled={mutation.isPending}>{mutation.isPending ? "Saving…" : "Save ownership"}</button></form> : <p className="execution-summary">{turn.leadTechnicianName ?? "No lead technician assigned"}</p>}</section>
    <section className="vendor-support-section"><div className="section-title"><div><p className="eyebrow">Outside support</p><h3>Vendor work</h3></div>{canUpdate && canViewVendors && <button className="button button--small button--secondary" onClick={() => setVendorEditor("new")}><Plus />Add</button>}</div>{turn.vendorJobs.length ? <div className="turn-vendor-list">{turn.vendorJobs.map((job) => <article key={job.id}><span><BriefcaseBusiness /><span><strong>{job.vendorName}</strong><small>{job.scope}{job.scheduledDate ? ` · ${formatDate(job.scheduledDate)}` : ""}</small>{job.paymentStatus && <small>{formatVendorAmount(job)} · {job.paymentStatus.replaceAll("_", " ")}{job.invoiceNumber ? ` · Invoice ${job.invoiceNumber}` : ""}</small>}</span></span><span className="turn-vendor-controls">{canUpdate ? <AppSelect compact ariaLabel={`${job.vendorName} vendor work status`} value={job.status} disabled={vendorStatusMutation.isPending} onChange={(value) => vendorStatusMutation.mutate({ id: job.id, status: value as TurnVendorJobStatus })} options={["proposed", "scheduled", "in_progress", "complete", "cancelled"].map((value) => ({ value, label: value.replaceAll("_", " ") }))} /> : <em>{job.status.replaceAll("_", " ")}</em>}{canUpdate && <button className="icon-button" aria-label={`Edit ${job.vendorName} vendor work`} onClick={() => setVendorEditor(job)}><Pencil /></button>}</span></article>)}</div> : <p className="execution-empty">No outside vendor work is attached to this Make Ready.</p>}</section>
    {vendorEditor && <VendorJobDialog turn={turn} job={vendorEditor === "new" ? null : vendorEditor} vendors={vendors.data?.vendors.filter((vendor) => vendor.status === "active") ?? []} onClose={() => setVendorEditor(null)} onSaved={async (updated) => { await onSaved(updated); setVendorEditor(null); }} />}
  </>;
}

function VendorJobDialog({ turn, job, vendors, onClose, onSaved }: { turn: TurnDetail; job: TurnVendorJob | null; vendors: VendorRecord[]; onClose: () => void; onSaved: (turn: TurnDetail) => void | Promise<void> }) {
  const [form, setForm] = useState({ vendorId: job?.vendorId ?? "", scope: job?.scope ?? "", status: job?.status ?? "proposed" as TurnVendorJobStatus, scheduledDate: job?.scheduledDate ?? "", quoteAmount: job?.quoteAmount?.toString() ?? "", approvedAmount: job?.approvedAmount?.toString() ?? "", invoiceAmount: job?.invoiceAmount?.toString() ?? "", invoiceNumber: job?.invoiceNumber ?? "", paymentStatus: job?.paymentStatus ?? "not_submitted" as VendorPaymentStatus });
  const [error, setError] = useState("");
  const mutation = useMutation({ mutationFn: () => api<{ turn: TurnDetail }>(job ? `/api/turns/${turn.id}/vendor-jobs/${job.id}` : `/api/turns/${turn.id}/vendor-jobs`, { method: job ? "PATCH" : "POST", body: JSON.stringify({ ...form, vendorId: job ? undefined : form.vendorId, scheduledDate: form.scheduledDate || null, quoteAmount: moneyOrNull(form.quoteAmount), approvedAmount: moneyOrNull(form.approvedAmount), invoiceAmount: moneyOrNull(form.invoiceAmount), invoiceNumber: form.invoiceNumber.trim() || null }) }), onSuccess: ({ turn: updated }) => onSaved(updated) });
  const submit = async (event: FormEvent) => { event.preventDefault(); setError(""); try { await mutation.mutateAsync(); } catch (reason) { setError(reason instanceof Error ? reason.message : "Vendor work could not be added"); } };
  return <div className="modal-layer modal-layer--nested"><section className="dialog dialog--compact vendor-financial-dialog" role="dialog" aria-modal="true" aria-labelledby="vendor-job-title"><header className="dialog__header"><span className="dialog__icon"><BriefcaseBusiness /></span><div><p className="eyebrow">Outside support</p><h2 id="vendor-job-title">{job ? "Update vendor work" : "Add vendor work"}</h2></div><button className="icon-button" onClick={onClose}><X /></button></header><form onSubmit={submit}><div className="form-grid"><label className="field field--full"><span>Vendor</span><AppSelect required searchable ariaLabel="Vendor" disabled={Boolean(job)} value={form.vendorId} onChange={(value) => setForm({ ...form, vendorId: value })} options={[{ value: "", label: "Select vendor" }, ...vendors.map((vendor) => ({ value: vendor.id, label: `${vendor.name} · ${vendor.specialties.join(", ") || "General"}` })), ...(job && !vendors.some((vendor) => vendor.id === job.vendorId) ? [{ value: job.vendorId, label: job.vendorName }] : [])]} /></label><label className="field field--full"><span>Supporting scope</span><textarea required rows={3} value={form.scope} onChange={(event) => setForm({ ...form, scope: event.target.value })} placeholder="Describe the service the vendor is handling. The lead technician retains ownership of the Make Ready." /></label><label className="field"><span>Work status</span><AppSelect ariaLabel="Work status" value={form.status} onChange={(value) => setForm({ ...form, status: value as TurnVendorJobStatus })} options={["proposed", "scheduled", "in_progress", "complete", "cancelled"].map((value) => ({ value, label: value.replaceAll("_", " ") }))} /></label><label className="field"><span>Scheduled date</span><input type="date" value={form.scheduledDate} onChange={(event) => setForm({ ...form, scheduledDate: event.target.value })} /></label><label className="field"><span>Quote</span><input type="number" min="0" step="0.01" value={form.quoteAmount} onChange={(event) => setForm({ ...form, quoteAmount: event.target.value })} /></label><label className="field"><span>Approved amount</span><input type="number" min="0" step="0.01" value={form.approvedAmount} onChange={(event) => setForm({ ...form, approvedAmount: event.target.value })} /></label><label className="field"><span>Final invoice</span><input type="number" min="0" step="0.01" value={form.invoiceAmount} onChange={(event) => setForm({ ...form, invoiceAmount: event.target.value })} /></label><label className="field"><span>Invoice number</span><input value={form.invoiceNumber} onChange={(event) => setForm({ ...form, invoiceNumber: event.target.value })} /></label><label className="field field--full"><span>Payment status</span><AppSelect ariaLabel="Payment status" value={form.paymentStatus} onChange={(value) => setForm({ ...form, paymentStatus: value as VendorPaymentStatus })} options={["not_submitted", "pending_approval", "approved", "paid", "disputed", "not_applicable"].map((value) => ({ value, label: value.replaceAll("_", " ") }))} /></label></div>{!job && !vendors.length && <p className="form-error">Add an active vendor in Operations before attaching vendor work.</p>}{error && <p className="form-error">{error}</p>}<footer className="dialog__footer"><button type="button" className="button button--ghost" onClick={onClose}>Cancel</button><button className="button button--primary" disabled={mutation.isPending || (!job && !vendors.length)}>{mutation.isPending ? "Saving…" : job ? "Save vendor work" : "Add vendor work"}</button></footer></form></section></div>;
}

function formatDate(value: string | null) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(`${value}T12:00:00`));
}

function formatMoney(value: number) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(value);
}

function moneyOrNull(value: string) {
  return value.trim() ? Number(value) : null;
}

function formatVendorAmount(job: TurnVendorJob) {
  if (job.invoiceAmount !== null) return `${formatMoney(job.invoiceAmount)} invoiced`;
  if (job.approvedAmount !== null) return `${formatMoney(job.approvedAmount)} approved`;
  if (job.quoteAmount !== null) return `${formatMoney(job.quoteAmount)} quoted`;
  return "No financial amount";
}

function isInspectionFinding(item: TurnItem) {
  return Boolean(item.inspectionCondition && item.inspectionCondition !== "good");
}

function shouldHighlightInspectionFinding(turnStatus: TurnStatus, item: TurnItem) {
  return turnStatus === "in_progress" && !["complete", "not_applicable"].includes(item.status) && isInspectionFinding(item);
}

function shouldHighlightScopeNote(turnStatus: TurnStatus, item: TurnItem) {
  return !["complete", "cancelled"].includes(turnStatus)
    && item.status !== "complete"
    && item.origin !== "inspection"
    && Boolean(item.notes?.trim());
}

function categoriesMatch(scopeCategory: string, inventoryCategory: string) {
  const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const scope = normalize(scopeCategory);
  const inventory = normalize(inventoryCategory);
  return scope === inventory || scope.includes(inventory) || inventory.includes(scope);
}

function formatQuantity(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}
