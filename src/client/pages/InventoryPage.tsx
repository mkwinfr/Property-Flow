import { InventoryTab } from "../components/operations/InventoryTab";
import { useProperty } from "../contexts/PropertyContext";

export function InventoryPage() {
  const { property } = useProperty();
  return <div className="page-stack inventory-page">
    <section className="page-heading"><div><p className="eyebrow">{property?.name}</p><h1>Inventory</h1><p>Stock levels, ledger history, reorders, and material usage across the property.</p></div></section>
    <InventoryTab />
  </div>;
}
