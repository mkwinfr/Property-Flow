import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Boxes, ClipboardCheck, ClipboardPen, PackageSearch, Search, Store, Wrench, X } from "lucide-react";
import type { GlobalSearchResult } from "../../shared/contracts";
import { useProperty } from "../contexts/PropertyContext";
import { api } from "../lib/api";
import { useRouter } from "../lib/router";

const resultIcon = { unit: Boxes, turn: ClipboardCheck, work_order: Wrench, inspection: ClipboardPen, vendor: Store, inventory: PackageSearch, template: ClipboardCheck };
const resultLabel = { unit: "Unit", turn: "Make Ready", work_order: "Work order", inspection: "Inspection", vendor: "Vendor", inventory: "Inventory", template: "Template" };
const destination = (result: GlobalSearchResult) => {
  if (result.type === "turn") return `/turns/${result.id}`;
  if (result.type === "unit") return "/units";
  if (result.type === "template") return "/templates";
  const tab = { work_order: "work-orders", inspection: "inspections", vendor: "vendors", inventory: "inventory" }[result.type];
  return `/operations?tab=${tab}`;
};

export function GlobalSearch() {
  const { propertyId } = useProperty(); const { navigate, path } = useRouter(); const [open, setOpen] = useState(false); const [query, setQuery] = useState(""); const [debounced, setDebounced] = useState(""); const input = useRef<HTMLInputElement>(null);
  useEffect(() => { const timer = window.setTimeout(() => setDebounced(query.trim()), 180); return () => window.clearTimeout(timer); }, [query]);
  useEffect(() => { const shortcut = (event: KeyboardEvent) => { if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); setOpen(true); } if (event.key === "Escape") setOpen(false); }; window.addEventListener("keydown", shortcut); return () => window.removeEventListener("keydown", shortcut); }, []);
  useEffect(() => { if (open) window.setTimeout(() => input.current?.focus(), 0); }, [open]);
  const search = useQuery({ queryKey: ["global-search", propertyId, debounced], queryFn: () => api<{ results: GlobalSearchResult[] }>(`/api/properties/${propertyId}/search?q=${encodeURIComponent(debounced)}`), enabled: Boolean(propertyId && debounced.length >= 2), staleTime: 15_000 });
  const close = () => { setOpen(false); setQuery(""); };
  const choose = (result: GlobalSearchResult) => { const next = destination(result); close(); if (next.split("?")[0] === path) window.location.assign(next); else navigate(next); };
  return <><button className="global-search-trigger" onClick={() => setOpen(true)} aria-label="Search Property Suite"><Search size={17} /><span>Search</span><kbd>Ctrl K</kbd></button>{open && <div className="modal-layer global-search-layer" role="dialog" aria-modal="true" aria-labelledby="global-search-title" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}><section className="global-search-dialog"><header><Search size={19} /><input ref={input} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search units, Make Readies, work orders, inspections…" aria-label="Search Property Suite" /><button type="button" className="icon-button" onClick={close} aria-label="Close search"><X /></button></header><div className="global-search-dialog__content"><div className="global-search-dialog__heading"><div><p className="eyebrow">Property search</p><h2 id="global-search-title">Find what you need</h2></div><small>Results only include records you can access.</small></div>{query.trim().length < 2 ? <p className="global-search-empty">Type at least two characters to search this property.</p> : search.isPending ? <div className="page-loading"><span /><span /><span /></div> : search.data?.results.length ? <div className="global-search-results">{search.data.results.map((result) => { const Icon = resultIcon[result.type]; return <button type="button" key={`${result.type}-${result.id}`} onClick={() => choose(result)}><span className={`global-search-results__icon global-search-results__icon--${result.type}`}><Icon /></span><span><small>{resultLabel[result.type]}</small><strong>{result.title}</strong><em>{result.subtitle}</em></span><ArrowRight /></button>; })}</div> : <p className="global-search-empty">No matching records found.</p>}</div><footer><span><kbd>Esc</kbd> Close</span><span><kbd>Ctrl K</kbd> Open search</span></footer></section></div>}</>;
}
