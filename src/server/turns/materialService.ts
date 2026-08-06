import { randomUUID } from "node:crypto";
import type Database from "better-sqlite3";
import type { TurnItemMaterialUsage, TurnStatus } from "../../shared/contracts.js";
import { db } from "../db/index.js";
import { badRequest, conflict, notFound } from "../lib/errors.js";

const now = () => new Date().toISOString();

export function listTurnItemMaterials(
  turnId: string,
  database: Database.Database = db,
): Map<string, TurnItemMaterialUsage[]> {
  const rows = database.prepare(
    `SELECT usage.id, usage.turn_item_id AS turnItemId,
            inventory.id AS inventoryItemId, inventory.sku, inventory.name, inventory.category,
            -usage.quantity_delta AS quantity, usage.unit_cost_snapshot AS unitCost,
            (-usage.quantity_delta * usage.unit_cost_snapshot) AS totalCost,
            actor.name AS usedByName, usage.created_at AS usedAt
     FROM inventory_transactions usage
     JOIN inventory_items inventory ON inventory.id = usage.inventory_item_id
     JOIN users actor ON actor.id = usage.created_by_user_id
     LEFT JOIN inventory_transactions reversal ON reversal.reverses_transaction_id = usage.id
     WHERE usage.turn_item_id IN (SELECT id FROM turn_items WHERE turn_id = ?)
       AND usage.quantity_delta < 0 AND reversal.id IS NULL
     ORDER BY usage.created_at, inventory.name`,
  ).all(turnId) as Array<TurnItemMaterialUsage & { turnItemId: string }>;

  const byItem = new Map<string, TurnItemMaterialUsage[]>();
  for (const row of rows) {
    const { turnItemId, ...usage } = row;
    byItem.set(turnItemId, [...(byItem.get(turnItemId) ?? []), {
      ...usage,
      quantity: Number(usage.quantity),
      unitCost: Number(usage.unitCost),
      totalCost: Number(usage.totalCost),
    }]);
  }
  return byItem;
}

export function recordTurnItemMaterialUsage(
  turnId: string,
  turnItemId: string,
  inventoryItemId: string,
  quantity: number,
  actorUserId: string,
  database: Database.Database = db,
): void {
  if (!Number.isFinite(quantity) || quantity <= 0) throw badRequest("Material quantity must be greater than zero");
  database.transaction(() => {
    const context = database.prepare(
      `SELECT t.property_id AS propertyId, t.status AS turnStatus,
              ti.status AS itemStatus, ti.title AS itemTitle
       FROM turn_items ti JOIN turns t ON t.id = ti.turn_id
       WHERE t.id = ? AND ti.id = ?`,
    ).get(turnId, turnItemId) as {
      propertyId: string; turnStatus: TurnStatus; itemStatus: string; itemTitle: string;
    } | undefined;
    if (!context) throw notFound("Make Ready scope item not found");
    if (context.turnStatus !== "in_progress") throw conflict("Materials can only be recorded while the Make Ready is in progress");
    if (context.itemStatus === "not_applicable") throw conflict("Reopen this scope item before recording materials");

    const inventory = database.prepare(
      `SELECT id, property_id AS propertyId, name, quantity_on_hand AS quantityOnHand,
              reorder_level AS reorderLevel, unit_cost AS unitCost
       FROM inventory_items WHERE id = ?`,
    ).get(inventoryItemId) as {
      id: string; propertyId: string; name: string; quantityOnHand: number; reorderLevel: number; unitCost: number;
    } | undefined;
    if (!inventory || inventory.propertyId !== context.propertyId) throw notFound("Inventory item not found at this property");
    if (inventory.quantityOnHand < quantity) throw conflict(`Only ${inventory.quantityOnHand} ${inventory.name} currently on hand`);

    const timestamp = now();
    const result = database.prepare(
      `UPDATE inventory_items SET quantity_on_hand = quantity_on_hand - ?, updated_at = ?
       WHERE id = ? AND quantity_on_hand >= ?`,
    ).run(quantity, timestamp, inventoryItemId, quantity);
    if (!result.changes) throw conflict("There is not enough stock available for this material usage");
    const transactionId = randomUUID();
    database.prepare(
      `INSERT INTO inventory_transactions
       (id, inventory_item_id, turn_item_id, quantity_delta, unit_cost_snapshot, reason,
        created_by_user_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(transactionId, inventoryItemId, turnItemId, -quantity, inventory.unitCost,
      `Used for Make Ready: ${context.itemTitle}`, actorUserId, timestamp);
    appendTurnActivity(database, turnId, context.propertyId, actorUserId, "turn.item.material.used", {
      turnItemId,
      transactionId,
      inventoryItemId,
      inventoryName: inventory.name,
      quantity,
      unitCost: inventory.unitCost,
      lowStock: inventory.quantityOnHand - quantity <= inventory.reorderLevel,
    }, timestamp);
  })();
}

export function reverseTurnItemMaterialUsage(
  turnId: string,
  turnItemId: string,
  usageTransactionId: string,
  actorUserId: string,
  database: Database.Database = db,
): void {
  database.transaction(() => {
    const usage = database.prepare(
      `SELECT usage.id, usage.inventory_item_id AS inventoryItemId,
              usage.quantity_delta AS quantityDelta, usage.unit_cost_snapshot AS unitCost,
              usage.reason, inventory.name AS inventoryName,
              turn.property_id AS propertyId, turn.status AS turnStatus
       FROM inventory_transactions usage
       JOIN inventory_items inventory ON inventory.id = usage.inventory_item_id
       JOIN turn_items item ON item.id = usage.turn_item_id
       JOIN turns turn ON turn.id = item.turn_id
       WHERE usage.id = ? AND usage.turn_item_id = ? AND turn.id = ? AND usage.quantity_delta < 0`,
    ).get(usageTransactionId, turnItemId, turnId) as {
      id: string; inventoryItemId: string; quantityDelta: number; unitCost: number; reason: string;
      inventoryName: string; propertyId: string; turnStatus: TurnStatus;
    } | undefined;
    if (!usage) throw notFound("Material usage entry not found");
    if (usage.turnStatus !== "in_progress") throw conflict("Materials can only be corrected while the Make Ready is in progress");
    const reversed = database.prepare(
      "SELECT id FROM inventory_transactions WHERE reverses_transaction_id = ?",
    ).get(usage.id);
    if (reversed) throw conflict("This material usage has already been removed");

    const quantity = -usage.quantityDelta;
    const timestamp = now();
    database.prepare(
      "UPDATE inventory_items SET quantity_on_hand = quantity_on_hand + ?, updated_at = ? WHERE id = ?",
    ).run(quantity, timestamp, usage.inventoryItemId);
    const reversalId = randomUUID();
    database.prepare(
      `INSERT INTO inventory_transactions
       (id, inventory_item_id, turn_item_id, quantity_delta, unit_cost_snapshot, reason,
        created_by_user_id, created_at, reverses_transaction_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(reversalId, usage.inventoryItemId, turnItemId, quantity, usage.unitCost,
      `Corrected material usage: ${usage.reason}`, actorUserId, timestamp, usage.id);
    appendTurnActivity(database, turnId, usage.propertyId, actorUserId, "turn.item.material.corrected", {
      turnItemId,
      usageTransactionId: usage.id,
      reversalId,
      inventoryItemId: usage.inventoryItemId,
      inventoryName: usage.inventoryName,
      quantity,
    }, timestamp);
  })();
}

function appendTurnActivity(
  database: Database.Database,
  turnId: string,
  propertyId: string,
  actorUserId: string,
  action: string,
  details: Record<string, unknown>,
  timestamp: string,
) {
  database.prepare(
    `INSERT INTO activity_events
     (id, property_id, actor_user_id, entity_type, entity_id, action, details_json, created_at)
     VALUES (?, ?, ?, 'turn', ?, ?, ?, ?)`,
  ).run(randomUUID(), propertyId, actorUserId, turnId, action, JSON.stringify(details), timestamp);
}
