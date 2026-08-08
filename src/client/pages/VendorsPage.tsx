import { VendorsTab } from "../components/operations/VendorsTab";
import { useProperty } from "../contexts/PropertyContext";

export function VendorsPage() {
  const { property } = useProperty();
  return <div className="page-stack vendors-page">
    <section className="page-heading"><div><p className="eyebrow">{property?.name}</p><h1>Vendors</h1><p>External partners, specialties, ratings, and active workload.</p></div></section>
    <VendorsTab />
  </div>;
}
