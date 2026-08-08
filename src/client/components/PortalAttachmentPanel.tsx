import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, Image, Paperclip, Upload, X } from "lucide-react";
import type { PortalAttachment } from "../../shared/contracts";
import { api } from "../lib/api";
import { PortalLoading } from "./portal/PortalPrimitives";

export function PortalAttachmentPanel({
  workOrderId,
  canUpload,
}: {
  workOrderId: string;
  canUpload: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<PortalAttachment | null>(null);
  const queryKey = ["portal-maintenance-attachments", workOrderId];
  const query = useQuery({
    queryKey,
    queryFn: () => api<{ attachments: PortalAttachment[] }>(`/api/portal/maintenance/${workOrderId}/attachments`),
  });
  const upload = useMutation({
    mutationFn: async (file: File) => api(`/api/portal/maintenance/${workOrderId}/attachments`, {
      method: "POST",
      body: JSON.stringify({
        originalName: file.name,
        mimeType: file.type,
        dataBase64: await readDataUrl(file),
        caption: null,
      }),
    }),
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey }); },
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
    <section className="attachment-panel">
      <header>
        <div><p className="eyebrow">Photos</p><h3>Issue Photos</h3></div>
        {canUpload && <>
          <input ref={input} hidden type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={(event) => void select(event.target.files?.[0])} />
          <button className="button button--ghost button--small" disabled={upload.isPending} onClick={() => input.current?.click()}>
            <Upload size={14} />{upload.isPending ? "Uploading…" : "Add photo"}
          </button>
        </>}
      </header>
      {error && <p className="form-error">{error}</p>}
      {query.isPending ? <PortalLoading label="Loading issue photos" /> : <div className="attachment-list">
        {query.data?.attachments.map((item) => item.mimeType.startsWith("image/")
          ? <button type="button" className="attachment-list__item" key={item.id} onClick={() => setPreview(item)}>
            <span><Image /></span>
            <span><strong>{item.originalName}</strong><small>{formatBytes(item.sizeBytes)} · {new Date(item.createdAt).toLocaleDateString()}</small></span>
          </button>
          : <a key={item.id} href={`/api/portal/attachments/${item.id}/content`} target="_blank" rel="noreferrer">
            <span><FileText /></span>
            <span><strong>{item.originalName}</strong><small>{formatBytes(item.sizeBytes)} · {new Date(item.createdAt).toLocaleDateString()}</small></span>
          </a>)}
        {!query.data?.attachments.length && <p className="attachment-empty"><Paperclip size={16} />No photos attached</p>}
      </div>}
    </section>
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
