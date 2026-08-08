import { useProperty } from "../contexts/PropertyContext";
import { OperationsOverview } from "../components/operations/OperationsOverview";
import { useRouter } from "../lib/router";

export function OperationsPage() {
  const { property } = useProperty();
  const { navigate } = useRouter();
  return <div className="page-stack operations-page">
    <section className="page-heading"><div><p className="eyebrow">{property?.name}</p><h1>Control center</h1><p>Maintenance, inspections, inventory, and compliance at a glance.</p></div></section>
    <OperationsOverview onNavigate={(destination) => navigate(destination)} />
  </div>;
}
