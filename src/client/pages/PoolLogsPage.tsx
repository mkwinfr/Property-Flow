import { PoolLogsTab } from "../components/operations/PoolLogsTab";
import { useProperty } from "../contexts/PropertyContext";

export function PoolLogsPage() {
  const { property } = useProperty();
  return <div className="page-stack pool-logs-page">
    <section className="page-heading"><div><p className="eyebrow">{property?.name}</p><h1>Pool log</h1><p>Daily chemistry readings and compliance exceptions in one focused workspace.</p></div></section>
    <PoolLogsTab />
  </div>;
}
