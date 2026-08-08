import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Mail, MailOpen } from "lucide-react";
import type { PortalMessage } from "../../../shared/contracts";
import {
  PortalEmptyState,
  PortalLoading,
  PortalPageHeader,
  PortalStatusBadge,
} from "../../components/portal/PortalPrimitives";
import { api } from "../../lib/api";

export function PortalMessagesPage() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["portal-messages"],
    queryFn: () => api<{ messages: PortalMessage[]; unreadCount: number }>("/api/portal/messages"),
  });
  const markRead = useMutation({
    mutationFn: (messageId: string) => api<{ message: PortalMessage }>(`/api/portal/messages/${messageId}/read`, { method: "POST" }),
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ["portal-messages"] }); },
  });
  const messages = query.data?.messages ?? [];

  return <div className="page-stack portal-page">
    <PortalPageHeader
      eyebrow="Community"
      title="Your Inbox"
      description="Announcements, reminders, and updates directly from your property team."
      compact
      action={query.data && query.data.unreadCount > 0 ? <PortalStatusBadge value={`${query.data.unreadCount} unread`} tone="info" /> : undefined}
    />
    {query.isPending ? <PortalLoading label="Loading messages" /> : query.isError ? <PortalEmptyState icon={Mail} title="Inbox Unavailable" detail="We could not load your messages right now. Please refresh and try again." /> : messages.length ? <section className="portal-message-list">
      {messages.map((message) => <MessageCard key={message.id} message={message} onOpen={() => { if (!message.readAt) void markRead.mutate(message.id); }} />)}
    </section> : <PortalEmptyState icon={Mail} title="You're All Caught Up" detail="Property announcements and updates will appear here when your team sends them." />}
  </div>;
}

function MessageCard({ message, onOpen }: { message: PortalMessage; onOpen: () => void }) {
  const unread = !message.readAt;
  return <article className={`portal-message-card ${unread ? "portal-message-card--unread" : ""}`}>
    <header>
      <span className="portal-message-card__icon">{unread ? <Mail size={18} /> : <MailOpen size={18} />}</span>
      <div>
        <strong>{message.subject}</strong>
        <small>{message.campaignName} · {formatDate(message.sentAt)}{unread ? " · Unread" : ""}</small>
      </div>
    </header>
    <p>{message.body}</p>
    {unread && <button type="button" className="button button--ghost button--small" onClick={onOpen}>Mark as read</button>}
  </article>;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}
