import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, X } from "lucide-react";
import type { NotificationPreference } from "../../shared/contracts";
import { api } from "../lib/api";

const notificationLabels: Record<string, string> = {
  "turn.assigned": "Turn assignments",
  "turn.blocked": "Turn blockers",
  "turn.blocker.resolved": "Blocker resolutions",
  "turn.rework": "Turn rework",
  "pool.exception": "Pool log exceptions",
  "workorder.assigned": "Work order assignments",
};

export function NotificationPreferencesDialog({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ["notification-preferences"], queryFn: () => api<{ preferences: NotificationPreference[] }>("/api/notification-preferences") });
  const [local, setLocal] = useState<NotificationPreference[]>([]);
  useEffect(() => { if (query.data) setLocal(query.data.preferences); }, [query.data]);
  const types = useMemo(() => [...new Set(local.map((pref) => pref.notificationType))], [local]);
  const saveMutation = useMutation({
    mutationFn: () => api("/api/notification-preferences", { method: "PUT", body: JSON.stringify({ preferences: local }) }),
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ["notification-preferences"] }); onClose(); },
  });
  const toggle = (notificationType: string, channel: NotificationPreference["channel"]) => {
    setLocal((current) => current.map((pref) => pref.notificationType === notificationType && pref.channel === channel ? { ...pref, enabled: !pref.enabled } : pref));
  };
  const isEnabled = (notificationType: string, channel: NotificationPreference["channel"]) =>
    local.find((pref) => pref.notificationType === notificationType && pref.channel === channel)?.enabled ?? false;

  return <div className="modal-layer"><section className="dialog"><header className="dialog__header"><span className="dialog__icon"><Bell /></span><div><p className="eyebrow">Personal settings</p><h2>Notification preferences</h2></div><button className="icon-button" onClick={onClose}><X /></button></header>
    {query.isLoading ? <p className="notification-empty">Loading preferences…</p> : <div className="data-table-wrap"><table className="data-table"><thead><tr><th>Notification</th><th>In app</th><th>Email</th><th>SMS</th></tr></thead><tbody>
      {types.map((type) => <tr key={type}><td>{notificationLabels[type] ?? type}</td>{(["in_app", "email", "sms"] as const).map((channel) => <td key={channel}><label className="check-field"><input type="checkbox" checked={isEnabled(type, channel)} onChange={() => toggle(type, channel)} /></label></td>)}</tr>)}
    </tbody></table></div>}
    <footer className="dialog__footer"><button type="button" className="button button--ghost" onClick={onClose}>Cancel</button><button className="button button--primary" disabled={saveMutation.isPending} onClick={() => void saveMutation.mutate()}>{saveMutation.isPending ? "Saving…" : "Save preferences"}</button></footer>
  </section></div>;
}
