import { randomUUID } from "node:crypto";
import type { InventoryRecord, InventoryReorder, InventoryReorderStatus } from "../../shared/contracts.js";
import { db } from "../db/index.js";
import type { AppDatabase } from "../db/database.js";
import { badRequest, conflict, notFound } from "../lib/errors.js";
import { appendActivity, now } from "./shared.js";

interface InventoryRow { id: string; property_id: string; quantity_on_hand: number; unit_cost: number; }

export function listInventory(propertyId: string): InventoryRecord[] {
  return db.prepare(
    `SELECT id, property_id AS propertyId, sku, name, category, quantity_on_hand AS quantityOnHand,
            reorder_level AS reorderLevel, unit_cost AS unitCost, supplier,
            MAX(1, reorder_level * 2 - quantity_on_hand) AS suggestedReorderQuantity,
            (SELECT ir.status FROM inventory_reorders ir
             WHERE ir.inventory_item_id = inventory_items.id AND ir.status IN ('requested', 'ordered')
             ORDER BY ir.requested_at DESC LIMIT 1) AS activeReorderStatus
     FROM inventory_items WHERE property_id = ? ORDER BY category, name`,
  ).all(propertyId) as InventoryRecord[];
}

export function listInventoryReorders(propertyId: string, database: AppDatabase = db): InventoryReorder[] {
  return database.prepare(
    `SELECT ir.id, ir.property_id AS propertyId, ir.inventory_item_id AS inventoryItemId,
            item.sku, item.name AS itemName, ir.quantity, ir.supplier, ir.status,
            item.unit_cost AS unitCost, ir.quantity * item.unit_cost AS estimatedTotal,
            requester.name AS requestedByName, ir.requested_at AS requestedAt,
            ir.ordered_at AS orderedAt, ir.received_at AS receivedAt
     FROM inventory_reorders ir
     JOIN inventory_items item ON item.id = ir.inventory_item_id
     JOIN users requester ON requester.id = ir.requested_by_user_id
     WHERE ir.property_id = ?
     ORDER BY CASE ir.status WHEN 'requested' THEN 1 WHEN 'ordered' THEN 2 WHEN 'received' THEN 3 ELSE 4 END,
              ir.requested_at DESC`,
  ).all(propertyId) as InventoryReorder[];
}

export function createInventoryReorder(
  propertyId: string,
  inventoryItemId: string,
  actorUserId: string,
  quantity: number,
  supplier?: string | null,
  database: AppDatabase = db,
): InventoryReorder {
  const item = database.prepare(
    "SELECT id, name, supplier FROM inventory_items WHERE id = ? AND property_id = ?",
  ).get(inventoryItemId, propertyId) as { id: string; name: string; supplier: string | null } | undefined;
  if (!item) throw notFound("Inventory item not found at this property");
  const active = database.prepare(
    "SELECT id FROM inventory_reorders WHERE inventory_item_id = ? AND status IN ('requested', 'ordered')",
  ).get(inventoryItemId);
  if (active) throw conflict("This inventory item already has an active reorder");
  const id = randomUUID();
  const timestamp = now();
  database.transaction(() => {
    database.prepare(
      `INSERT INTO inventory_reorders
       (id, property_id, inventory_item_id, quantity, supplier, status, requested_by_user_id,
        requested_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'requested', ?, ?, ?, ?)`,
    ).run(id, propertyId, inventoryItemId, quantity, supplier ?? item.supplier, actorUserId, timestamp, timestamp, timestamp);
    appendActivity(propertyId, actorUserId, "inventory_reorder", id, "inventory.reorder.requested", {
      inventoryItemId, itemName: item.name, quantity,
    }, database);
  })();
  return listInventoryReorders(propertyId, database).find((record) => record.id === id)!;
}

export function updateInventoryReorder(
  reorderId: string,
  actorUserId: string,
  status: InventoryReorderStatus,
  database: AppDatabase = db,
): InventoryReorder {
  const reorder = database.prepare(
    `SELECT ir.*, item.name AS item_name, item.unit_cost
     FROM inventory_reorders ir JOIN inventory_items item ON item.id = ir.inventory_item_id
     WHERE ir.id = ?`,
  ).get(reorderId) as Record<string, unknown> | undefined;
  if (!reorder) throw notFound("Inventory reorder not found");
  const current = String(reorder.status) as InventoryReorderStatus;
  const allowed: Record<InventoryReorderStatus, InventoryReorderStatus[]> = {
    requested: ["ordered", "cancelled"],
    ordered: ["received", "cancelled"],
    received: [],
    cancelled: [],
  };
  if (!allowed[current].includes(status)) throw badRequest(`A ${current} reorder cannot move to ${status}`);
  const timestamp = now();
  database.transaction(() => {
    database.prepare(
      `UPDATE inventory_reorders SET status = ?,
       ordered_at = CASE WHEN ? = 'ordered' THEN ? ELSE ordered_at END,
       received_at = CASE WHEN ? = 'received' THEN ? ELSE received_at END,
       received_by_user_id = CASE WHEN ? = 'received' THEN ? ELSE received_by_user_id END,
       updated_at = ? WHERE id = ?`,
    ).run(status, status, timestamp, status, timestamp, status, actorUserId, timestamp, reorderId);
    if (status === "received") {
      database.prepare("UPDATE inventory_items SET quantity_on_hand = quantity_on_hand + ?, updated_at = ? WHERE id = ?")
        .run(reorder.quantity, timestamp, reorder.inventory_item_id);
      database.prepare(
        `INSERT INTO inventory_transactions
         (id, inventory_item_id, quantity_delta, unit_cost_snapshot, reason, created_by_user_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ).run(randomUUID(), reorder.inventory_item_id, reorder.quantity, reorder.unit_cost,
        `Received reorder for ${String(reorder.item_name)}`, actorUserId, timestamp);
    }
    appendActivity(String(reorder.property_id), actorUserId, "inventory_reorder", reorderId, `inventory.reorder.${status}`, {
      inventoryItemId: reorder.inventory_item_id, quantity: reorder.quantity,
    }, database);
  })();
  return listInventoryReorders(String(reorder.property_id), database).find((record) => record.id === reorderId)!;
}

export function adjustInventory(itemId: string, actorUserId: string, quantityDelta: number, reason: string): InventoryRecord {
  const item = db.prepare("SELECT * FROM inventory_items WHERE id = ?").get(itemId) as InventoryRow | undefined;
  if (!item) throw notFound("Inventory item not found");
  if (item.quantity_on_hand + quantityDelta < 0) throw conflict("This adjustment would make stock negative");
  db.transaction(() => {
    db.prepare("UPDATE inventory_items SET quantity_on_hand = quantity_on_hand + ?, updated_at = ? WHERE id = ?")
      .run(quantityDelta, now(), itemId);
    db.prepare(
      `INSERT INTO inventory_transactions
       (id, inventory_item_id, quantity_delta, unit_cost_snapshot, reason, created_by_user_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).run(randomUUID(), itemId, quantityDelta, item.unit_cost, reason, actorUserId, now());
    appendActivity(item.property_id, actorUserId, "inventory", itemId, "inventory.adjusted", { quantityDelta, reason });
  })();
  return listInventory(item.property_id).find((record) => record.id === itemId)!;
}
