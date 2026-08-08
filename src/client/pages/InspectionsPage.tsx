import { InspectionsTab } from "../components/operations/InspectionsTab";
import { inspectionsContextFromSearch } from "../lib/staffRoutes";
import { useRouter } from "../lib/router";

export function InspectionsPage() {
  const { search } = useRouter();
  const context = inspectionsContextFromSearch(search);
  return <div className="page-stack inspections-page"><InspectionsTab context={context} /></div>;
}
