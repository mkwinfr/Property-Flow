import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, Image, Paperclip, Upload, X } from "lucide-react";
import type { PortalAttachment } from "../../shared/contracts";
import { api } from "../lib/api";
import {
  PortalEmptyState,
  PortalLoading,
  PortalSectionHeading,
  PortalSurface,
} from "./portal/PortalPrimitives";

export function PortalSubmissionPanel() {
  const input = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const [error, setError] = useState("");
  const [notes, setNotes] = useState("");
  const [preview, setPreview] = useState<PortalAttachment | null>(null);
  const queryKey = ["portal-document-submissions"];
  const query = useQuery({
    queryKey,
    queryFn: () => api<{ submissions: PortalAttachment[] }>("/api/portal/documents/submissions"),
  });
  const upload = useMutation({
    mutationFn: async (file: File) => api("/api/portal/documents/submissions", {
      method: "POST",
      body: JSON.stringify({
        originalName: file.name,
        mimeType: file.type,
        dataBase64: await readDataUrl(file),
        caption: notes.trim() || null,
      }),
    }),
    onSuccess: async () => {
      setNotes("");
      await queryClient.invalidateQueries({ queryKey });
    },
  });
  const select = async (file?: File) => {
    if (!file) return;
    setError("");
    try { await upload.mutateAsync(file); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Upload failed"); }
    finally { if (input.current) input.current.value = ""; }
  };
  useEffect(() => {
    if (!preview) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setPreview(null); };
    const previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      window.removeEventListener("keydown", closeOnEscape);
      document.body.style.overflow = previousBodyOverflow;
    };
  }, [preview]);

  return <>
    <PortalSurface className="portal-submission-panel">
      <PortalSectionHeading eyebrow="Secure delivery" title="Send a Document" detail="Share insurance cards, ID copies, pet records, or anything your property team needs." />
      <div className="portal-submission-form">
        <label className="field field--full">
          <span>Notes for the office (optional)</span>
          <textarea rows={2} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Example: Updated renter's insurance policy" />
        </label>
        <input ref={input} hidden type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={(event) => void select(event.target.files?.[0])} />
        <button className="button button--primary" disabled={upload.isPending} onClick={() => input.current?.click()}>
          <Upload size={16} />{upload.isPending ? "Uploading…" : "Choose file to send"}
        </button>
      </div>
      {error && <p className="form-error">{error}</p>}
    </PortalSurface>
    <PortalSurface>
      <PortalSectionHeading eyebrow="Delivery history" title={`${query.data?.submissions.length ?? 0} Sent`} detail="Files previously shared with your property team." />
      {query.isPending ? <PortalLoading label="Loading sent documents" /> : query.isError ? <PortalEmptyState icon={Paperclip} title="Delivery History Unavailable" detail="We could not load your sent documents. Please refresh and try again." /> : query.data?.submissions.length ? <div className="portal-document-list">
        {query.data?.submissions.map((item) => item.mimeType.startsWith("image/")
          ? <button type="button" key={item.id} className="portal-document-card portal-document-card--button" onClick={() => setPreview(item)}>
            <Image size={18} />
            <span><strong>{item.originalName}</strong><small>{item.caption ? `${item.caption} · ` : ""}{formatBytes(item.sizeBytes)} · {formatDate(item.createdAt)}</small></span>
          </button>
          : <a key={item.id} className="portal-document-card" href={`/api/portal/attachments/${item.id}/content`} target="_blank" rel="noreferrer">
            <FileText size={18} />
            <span><strong>{item.originalName}</strong><small>{item.caption ? `${item.caption} · ` : ""}{formatBytes(item.sizeBytes)} · {formatDate(item.createdAt)}</small></span>
          </a>)}
      </div> : <PortalEmptyState icon={Paperclip} title="No Documents Sent Yet" detail="When you securely share a file with the office, its delivery record will appear here." />}
    </PortalSurface>
    {preview && <div className="modal-layer attachment-preview-layer" role="dialog" aria-modal="true" onMouseDown={(event) => { if (event.target === event.currentTarget) setPreview(null); }}>
      <section className="attachment-preview">
        <header>
          <div><p className="eyebrow">Photo preview</p><h2>{preview.originalName}</h2></div>
          <button type="button" className="icon-button" aria-label="Close photo preview" onClick={() => setPreview(null)}><X /></button>
        </header>
        <div className="attachment-preview__image">
          <img src={`/api/portal/attachments/${preview.id}/content`} alt={preview.originalName} />
        </div>
        <footer><button type="button" className="button button--primary" onClick={() => setPreview(null)}>Close</button></footer>
      </section>
    </div>}
  </>;
}

const readDataUrl = (file: File) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result));
  reader.onerror = () => reject(reader.error);
  reader.readAsDataURL(file);
});

const formatBytes = (value: number) => value < 1024 ? `${value} B` : value < 1024 * 1024 ? `${(value / 1024).toFixed(1)} KB` : `${(value / 1024 / 1024).toFixed(1)} MB`;

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}
