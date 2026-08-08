import { RecurringJobsTab } from "../components/operations/RecurringJobsTab";
import { useProperty } from "../contexts/PropertyContext";

export function RecurringJobsPage() {
  const { property } = useProperty();
  return <div className="page-stack recurring-jobs-page">
    <section className="page-heading"><div><p className="eyebrow">{property?.name}</p><h1>Recurring jobs</h1><p>Scheduled maintenance templates that generate work orders when due.</p></div></section>
    <RecurringJobsTab />
  </div>;
}
