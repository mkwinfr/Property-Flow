import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck, X } from "lucide-react";
import type { NotificationRecord } from "../../shared/contracts";
import { api } from "../lib/api";

export function NotificationCenter() {
  const [open, setOpen] = useState(false); const root = useRef<HTMLDivElement>(null); const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ["notifications"], queryFn: () => api<{ notifications: NotificationRecord[]; unread: number }>("/api/notifications"), refetchInterval: 60_000 });
  const readOne = useMutation({ mutationFn: (id: string) => api<void>(`/api/notifications/${id}/read`, { method: "PATCH" }), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }) });
  const readAll = useMutation({ mutationFn: () => api<void>("/api/notifications/read-all", { method: "POST" }), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }) });
  useEffect(() => { const close = (event: MouseEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); }; document.addEventListener("mousedown", close); return () => document.removeEventListener("mousedown", close); }, []);
  return <div className="notification-center" ref={root}><button className="notification-button" onClick={() => setOpen((value) => !value)} aria-label={`Notifications${query.data?.unread ? `, ${query.data.unread} unread` : ""}`}><Bell size={19} />{Boolean(query.data?.unread) && <b>{Math.min(query.data!.unread, 9)}</b>}</button>{open && <section className="notification-popover"><header><div><p className="eyebrow">Inbox</p><h2>Notifications</h2></div><button className="icon-button" onClick={() => setOpen(false)}><X size={18} /></button></header>{query.data?.unread ? <button className="notification-read-all" onClick={() => readAll.mutate()}><CheckCheck size={15} />Mark all as read</button> : null}<div className="notification-list">{query.data?.notifications.length ? query.data.notifications.map((item) => <button className={`notification-item ${item.readAt ? "" : "notification-item--unread"}`} key={item.id} onClick={() => { if (!item.readAt) readOne.mutate(item.id); }}><i /><span><strong>{item.title}</strong><p>{item.message}</p><small>{relativeTime(item.createdAt)}</small></span></button>) : <p className="notification-empty">You’re all caught up.</p>}</div></section>}</div>;
}

function relativeTime(value: string) { const seconds = Math.max(1, Math.round((Date.now() - new Date(value).getTime()) / 1000)); if (seconds < 60) return "Just now"; if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`; if (seconds < 86_400) return `${Math.floor(seconds / 3600)}h ago`; return `${Math.floor(seconds / 86_400)}d ago`; }
