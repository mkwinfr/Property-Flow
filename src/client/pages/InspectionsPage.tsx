import { InspectionsTab } from "../components/operations/InspectionsTab";
import { useProperty } from "../contexts/PropertyContext";
import { inspectionsContextFromSearch } from "../lib/staffRoutes";
import { useRouter } from "../lib/router";

export function InspectionsPage() {
  const { property } = useProperty();
  const { search } = useRouter();
  const context = inspectionsContextFromSearch(search);
  const copy = context === "leasing"
    ? { description: "Move-in inspections and final walkthroughs for incoming residents." }
    : { description: "Move-out inspections, findings, and Make Ready generation." };
  return <div className="page-stack inspections-page">
    <section className="page-heading"><div><p className="eyebrow">{property?.name}</p><h1>Inspections</h1><p>{copy.description}</p></div></section>
    <InspectionsTab context={context} />
  </div>;
}
