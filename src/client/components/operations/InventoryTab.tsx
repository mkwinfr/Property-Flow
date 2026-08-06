import { useMemo, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ArrowDownUp, CheckCircle2, PackageCheck, PackageSearch, Search, ShoppingCart, X } from "lucide-react";
import type { InventoryRecord, InventoryReorder, InventoryReorderStatus } from "../../../shared/contracts";
import { useAuth } from "../../contexts/AuthContext";
import { useProperty } from "../../contexts/PropertyContext";
import { api } from "../../lib/api";

export function InventoryTab() {
  const { propertyId } = useProperty();
  const { can } = useAuth();
  const canPurchase = can("turns:review") && can("inventory:manage");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<InventoryRecord | null>(null);
  const [reorderItem, setReorderItem] = useState<InventoryRecord | null>(null);
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ["inventory", propertyId], queryFn: () => api<{ inventory: InventoryRecord[] }>(`/api/properties/${propertyId}/inventory`), enabled: Boolean(propertyId) });
  const reorderQuery = useQuery({ queryKey: ["inventory-reorders", propertyId], queryFn: () => api<{ reorders: InventoryReorder[] }>(`/api/properties/${propertyId}/inventory-reorders`), enabled: Boolean(propertyId) && canPurchase });
  const items = useMemo(() => (query.data?.inventory ?? []).filter((item) => !search || `${item.name} ${item.sku} ${item.category}`.toLowerCase().includes(search.toLowerCase())), [query.data, search]);
  const activeReorders = reorderQuery.data?.reorders.filter((reorder) => ["requested", "ordered"].includes(reorder.status)) ?? [];
  const updateReorder = useMutation({
    mutationFn: ({ id, status }: { id: string; status: InventoryReorderStatus }) => api(`/api/inventory-reorders/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }),
    onSuccess: async () => Promise.all([
      queryClient.invalidateQueries({ queryKey: ["inventory", propertyId] }),
      queryClient.invalidateQueries({ queryKey: ["inventory-reorders", propertyId] }),
      queryClient.invalidateQueries({ queryKey: ["operations", propertyId] }),
    ]),
  });
  return <section className="ops-section"><header className="ops-section__header"><div><p className="eyebrow">Parts and supplies</p><h2>Inventory</h2><p>Track stock, request replenishment, and receive orders into the auditable ledger.</p></div></header>
    {canPurchase && activeReorders.length > 0 && <section className="reorder-queue"><div className="section-title"><div><p className="eyebrow">Purchasing</p><h3>Active reorder list</h3></div><span>{activeReorders.length} active</span></div><div className="reorder-list">{activeReorders.map((reorder) => <article key={reorder.id}><span className="reorder-list__icon"><ShoppingCart /></span><span><strong>{reorder.itemName}</strong><small>{formatQuantity(reorder.quantity)} units · {reorder.supplier ?? "Supplier not set"} · ${reorder.estimatedTotal.toFixed(2)} estimated</small></span><em>{reorder.status}</em><span className="reorder-list__actions">{reorder.status === "requested" && <button className="button button--small button--secondary" disabled={updateReorder.isPending} onClick={() => updateReorder.mutate({ id: reorder.id, status: "ordered" })}>Mark ordered</button>}{reorder.status === "ordered" && <button className="button button--small button--primary" disabled={updateReorder.isPending} onClick={() => updateReorder.mutate({ id: reorder.id, status: "received" })}><PackageCheck />Receive</button>}<button className="text-button text-button--danger" disabled={updateReorder.isPending} onClick={() => updateReorder.mutate({ id: reorder.id, status: "cancelled" })}>Cancel</button></span></article>)}</div></section>}
    <div className="toolbar"><label className="search-field"><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search item, SKU, or category" /></label><span className="board-count">{items.filter((item) => item.quantityOnHand <= item.reorderLevel).length} low stock</span></div>
    <div className="inventory-grid">{items.map((item) => { const low = item.quantityOnHand <= item.reorderLevel; return <article className={`inventory-card ${low ? "inventory-card--low" : ""}`} key={item.id}><header><span className="inventory-card__icon">{low ? <AlertTriangle /> : <PackageSearch />}</span><span className="inventory-sku">{item.sku}</span></header><h3>{item.name}</h3><p>{item.category}{item.supplier ? ` · ${item.supplier}` : ""}</p><div className="stock-level"><strong>{formatQuantity(item.quantityOnHand)}</strong><span>on hand<small>Reorder at {formatQuantity(item.reorderLevel)}</small></span></div><footer><span>${item.unitCost.toFixed(2)} each</span><span className="inventory-card__actions">{canPurchase && low && !item.activeReorderStatus && <button className="text-button" onClick={() => setReorderItem(item)}><ShoppingCart size={14} />Request reorder</button>}{canPurchase && item.activeReorderStatus && <em><CheckCircle2 />{item.activeReorderStatus}</em>}{can("inventory:manage") && <button className="text-button" onClick={() => setSelected(item)}><ArrowDownUp size={14} />Adjust stock</button>}</span></footer></article>; })}</div>
    <AdjustmentDialog item={selected} onClose={() => setSelected(null)} />
    {canPurchase && <ReorderDialog item={reorderItem} onClose={() => setReorderItem(null)} />}
  </section>;
}

function AdjustmentDialog({ item, onClose }: { item: InventoryRecord | null; onClose: () => void }) {
  const { propertyId } = useProperty(); const queryClient = useQueryClient();
  const [quantity, setQuantity] = useState(""); const [reason, setReason] = useState(""); const [error, setError] = useState("");
  const mutation = useMutation({ mutationFn: () => api(`/api/inventory/${item?.id}/adjustments`, { method: "POST", body: JSON.stringify({ quantityDelta: Number(quantity), reason }) }), onSuccess: async () => { await Promise.all([queryClient.invalidateQueries({ queryKey: ["inventory", propertyId] }), queryClient.invalidateQueries({ queryKey: ["operations", propertyId] })]); onClose(); } });
  if (!item) return null;
  const submit = async (event: FormEvent) => { event.preventDefault(); setError(""); try { await mutation.mutateAsync(); } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not adjust inventory"); } };
  return <div className="modal-layer"><section className="dialog dialog--compact"><header className="dialog__header"><span className="dialog__icon"><ArrowDownUp /></span><div><p className="eyebrow">Inventory ledger</p><h2>Adjust {item.name}</h2></div><button className="icon-button" onClick={onClose}><X /></button></header><form onSubmit={submit}><p className="form-context">Current quantity: <strong>{formatQuantity(item.quantityOnHand)}</strong></p><div className="form-grid"><label className="field"><span>Quantity change</span><input required type="number" step="0.01" value={quantity} onChange={(event) => setQuantity(event.target.value)} placeholder="Use -2 or 5" /></label><label className="field field--full"><span>Reason</span><input required minLength={3} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Used for work order, delivery received…" /></label></div>{error && <p className="form-error">{error}</p>}<footer className="dialog__footer"><button type="button" className="button button--ghost" onClick={onClose}>Cancel</button><button className="button button--primary" disabled={mutation.isPending}>Save adjustment</button></footer></form></section></div>;
}

function ReorderDialog({ item, onClose }: { item: InventoryRecord | null; onClose: () => void }) {
  const { propertyId } = useProperty(); const queryClient = useQueryClient();
  const [quantity, setQuantity] = useState(""); const [supplier, setSupplier] = useState(""); const [error, setError] = useState("");
  const effectiveQuantity = quantity || String(item?.suggestedReorderQuantity ?? 1);
  const effectiveSupplier = supplier || item?.supplier || "";
  const mutation = useMutation({ mutationFn: () => api(`/api/properties/${propertyId}/inventory-reorders`, { method: "POST", body: JSON.stringify({ inventoryItemId: item?.id, quantity: Number(effectiveQuantity), supplier: effectiveSupplier.trim() || null }) }), onSuccess: async () => { await Promise.all([queryClient.invalidateQueries({ queryKey: ["inventory", propertyId] }), queryClient.invalidateQueries({ queryKey: ["inventory-reorders", propertyId] })]); onClose(); } });
  if (!item) return null;
  const submit = async (event: FormEvent) => { event.preventDefault(); setError(""); try { await mutation.mutateAsync(); } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not request this reorder"); } };
  return <div className="modal-layer"><section className="dialog dialog--compact"><header className="dialog__header"><span className="dialog__icon"><ShoppingCart /></span><div><p className="eyebrow">Purchasing</p><h2>Reorder {item.name}</h2></div><button className="icon-button" onClick={onClose}><X /></button></header><form onSubmit={submit}><p className="form-context">On hand: <strong>{formatQuantity(item.quantityOnHand)}</strong> · Reorder level: <strong>{formatQuantity(item.reorderLevel)}</strong></p><div className="form-grid"><label className="field"><span>Order quantity</span><input required type="number" min="0.01" step="0.01" value={effectiveQuantity} onChange={(event) => setQuantity(event.target.value)} /></label><label className="field"><span>Supplier</span><input value={effectiveSupplier} onChange={(event) => setSupplier(event.target.value)} placeholder="Optional supplier" /></label></div><p className="form-context">Estimated total: <strong>${(Number(effectiveQuantity || 0) * item.unitCost).toFixed(2)}</strong></p>{error && <p className="form-error">{error}</p>}<footer className="dialog__footer"><button type="button" className="button button--ghost" onClick={onClose}>Cancel</button><button className="button button--primary" disabled={mutation.isPending || Number(effectiveQuantity) <= 0}>Request reorder</button></footer></form></section></div>;
}

function formatQuantity(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}
