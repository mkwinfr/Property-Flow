import { db } from "../db/index.js";
import {
  findEntityProperty,
  findTurnProperty,
  findUnitProperty,
  findWorkOrderProperty,
} from "../db/repositories/unitsRepository.js";

export function propertyIdFromUnit(unitId: string): string | null {
  return findUnitProperty(db, unitId)?.property_id ?? null;
}

export function propertyIdFromTurn(turnId: string): string | null {
  return findTurnProperty(db, turnId)?.property_id ?? null;
}

export function propertyIdFromWorkOrder(workOrderId: string): string | null {
  return findWorkOrderProperty(db, workOrderId)?.property_id ?? null;
}

export function propertyIdFromEntity(table: string, id: string): string | null {
  return findEntityProperty(db, table, id);
}
