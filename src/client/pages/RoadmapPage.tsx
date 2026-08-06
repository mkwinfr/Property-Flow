import { ArrowRight, Boxes, ClipboardPen, PackageSearch, ShieldCheck, Waves, Wrench } from "lucide-react";
import { Link, useRouter } from "../lib/router";

const operations = [
  { icon: Wrench, title: "Work orders", detail: "Resident and turn-related maintenance with assignments and service history.", phase: "Phase 2" },
  { icon: PackageSearch, title: "Inventory", detail: "Parts on hand, consumption against work, costs, and restock visibility.", phase: "Phase 2" },
  { icon: ClipboardPen, title: "Move-out inspections", detail: "Evidence-based inspections that propose make-ready work without duplicating it.", phase: "Phase 2" },
  { icon: Waves, title: "Pool logs", detail: "Scheduled readings, exceptions, trends, review, and export.", phase: "Phase 2" },
];
const administration = [
  { icon: ShieldCheck, title: "Roles and access", detail: "Fine-grained permissions with organization or property scope.", phase: "Foundation ready" },
  { icon: Boxes, title: "Turn templates", detail: "Draft, review, publish, and retire immutable template versions.", phase: "Phase 3 UI" },
];

export function RoadmapPage() {
  const admin = useRouter().path.includes("administration");
  const cards = admin ? administration : operations;
  return <div className="page-stack"><section className="page-heading"><div><p className="eyebrow">Rebuild roadmap</p><h1>{admin ? "Administration" : "Operations"}</h1><p>The architecture for these reference-system capabilities is defined; implementation follows the core turn workflow.</p></div></section><section className="roadmap-grid">{cards.map(({ icon: Icon, ...card }) => <article className="roadmap-card" key={card.title}><span><Icon /></span><small>{card.phase}</small><h2>{card.title}</h2><p>{card.detail}</p></article>)}</section><section className="callout"><div><strong>Why these aren’t empty forms</strong><p>Each feature will be rebuilt as a complete vertical slice—data rules, permissions, workflow, interface, audit history, and tests—rather than copied as disconnected screens.</p></div><Link to="/turns" className="button button--secondary">Explore the core workflow <ArrowRight size={16} /></Link></section></div>;
}
