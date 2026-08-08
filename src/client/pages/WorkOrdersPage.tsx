import { WorkOrdersTab } from "../components/operations/WorkOrdersTab";
import { useProperty } from "../contexts/PropertyContext";

export function WorkOrdersPage() {
  const { property } = useProperty();
  return <div className="page-stack work-orders-page">
    <section className="page-heading"><div><p className="eyebrow">{property?.name}</p><h1>Work orders</h1><p>Resident requests, access coordination, service records, and completion history.</p></div></section>
    <WorkOrdersTab />
  </div>;
}
