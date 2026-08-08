import { useEffect, useRef, useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { ArrowRight, Bot, Send, X } from "lucide-react";
import type { AssistantResponse, GlobalSearchResult } from "../../shared/contracts";
import { useProperty } from "../contexts/PropertyContext";
import { api } from "../lib/api";
import { useRouter } from "../lib/router";

import { staffDestinationForSearch } from "../lib/staffRoutes";

interface Message { role: "assistant" | "user"; content: string; sources?: GlobalSearchResult[] }
const sourceDestination = staffDestinationForSearch;

export function AssistantPanel() {
  const { propertyId } = useProperty(); const { navigate } = useRouter(); const [open, setOpen] = useState(false); const [question, setQuestion] = useState(""); const [messages, setMessages] = useState<Message[]>([{ role: "assistant", content: "I can help you find and summarize operational information in this property. I only use records you are allowed to see." }]); const input = useRef<HTMLInputElement>(null);
  const ask = useMutation({ mutationFn: (value: string) => api<AssistantResponse>(`/api/properties/${propertyId}/assistant`, { method: "POST", body: JSON.stringify({ question: value }) }), onSuccess: (result) => { setMessages((current) => [...current, { role: "assistant", content: result.answer, sources: result.sources }]); }, onError: (error) => { setMessages((current) => [...current, { role: "assistant", content: error instanceof Error ? error.message : "The assistant could not respond." }]); } });
  useEffect(() => { if (open) window.setTimeout(() => input.current?.focus(), 0); }, [open]);
  const submit = (event: FormEvent) => { event.preventDefault(); const value = question.trim(); if (!value || ask.isPending) return; setMessages((current) => [...current, { role: "user", content: value }]); setQuestion(""); ask.mutate(value); };
  const close = () => setOpen(false);
  return <><button className="assistant-trigger" onClick={() => setOpen(true)} aria-label="Open Property Suite assistant" title="Property Suite assistant"><Bot size={18} /></button>{open && <div className="assistant-layer" role="dialog" aria-modal="true" aria-labelledby="assistant-title"><section className="assistant-panel"><header><span className="assistant-panel__icon"><Bot /></span><div><p className="eyebrow">Local assistant</p><h2 id="assistant-title">Property Suite assistant</h2></div><button type="button" className="icon-button" onClick={close} aria-label="Close assistant"><X /></button></header><div className="assistant-panel__messages">{messages.map((message, index) => <div className={`assistant-message assistant-message--${message.role}`} key={`${message.role}-${index}`}><p>{message.content}</p>{message.sources?.length ? <div className="assistant-sources"><small>Related records</small>{message.sources.map((source) => <button type="button" key={`${source.type}-${source.id}`} onClick={() => { close(); navigate(sourceDestination(source)); }}><span>{source.title}</span><ArrowRight size={13} /></button>)}</div> : null}</div>)}{ask.isPending && <div className="assistant-message assistant-message--assistant assistant-message--thinking"><span /><span /><span /></div>}</div><form className="assistant-panel__composer" onSubmit={submit}><input ref={input} value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Ask about this property…" aria-label="Ask the assistant" maxLength={500} /><button type="submit" className="button button--primary" disabled={!question.trim() || ask.isPending} aria-label="Send question"><Send size={15} /></button></form><footer><span>Read-only answers from permitted records</span><span>Powered locally by Ollama</span></footer></section></div>}</>;
}
