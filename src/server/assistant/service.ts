import type { GlobalSearchResult } from "../../shared/contracts.js";
import { userCan } from "../auth/session.js";
import { config } from "../config.js";
import { getDashboard, listUnits } from "../portfolio/service.js";
import { listInspections, listInventory, listWorkOrders } from "../operations/service.js";
import { listTurns } from "../turns/service.js";
import { searchProperty } from "../search/service.js";

interface OllamaChatResponse { message?: { content?: string } }

const permissions = ["dashboard:view", "units:view", "turns:view", "workorders:view", "inspections:view", "vendors:view", "inventory:view", "templates:view"];
const words = (question: string) => [...new Set(question.toLowerCase().match(/[a-z0-9-]{2,}/g) ?? [])].filter((word) => !new Set(["what", "when", "where", "which", "show", "tell", "about", "the", "this", "that", "with", "from", "for", "and", "are", "has", "have", "does", "how", "many"]).has(word));

export async function askAssistant(userId: string, propertyId: string, question: string): Promise<{ answer: string; sources: GlobalSearchResult[] }> {
  const allowed = new Set(permissions.filter((permission) => userCan(userId, permission, propertyId)));
  const dashboard = allowed.has("dashboard:view") ? getDashboard(propertyId) : null;
  const context: string[] = [];
  if (dashboard) context.push(`Property totals: ${JSON.stringify(dashboard.units)}; Make Ready counts: ${JSON.stringify(dashboard.turns)}.`);
  if (allowed.has("units:view")) context.push(`Units: ${JSON.stringify(listUnits(propertyId).slice(0, 80).map((unit) => ({ unit: unit.unitNumber, building: unit.buildingName, occupancy: unit.occupancyStatus, activeMakeReady: unit.activeTurnStatus })))}.`);
  if (allowed.has("turns:view")) context.push(`Make Readies: ${JSON.stringify(listTurns(propertyId).slice(0, 60).map((turn) => ({ id: turn.id, unit: turn.unitNumber, status: turn.status, priority: turn.priority, targetReadyDate: turn.targetReadyDate, completed: `${turn.completedItems}/${turn.totalItems}`, lead: turn.leadTechnicianName })))}.`);
  if (allowed.has("workorders:view")) context.push(`Work orders: ${JSON.stringify(listWorkOrders(propertyId, false).slice(0, 80).map((workOrder) => ({ id: workOrder.id, unit: workOrder.unitNumber, title: workOrder.title, status: workOrder.status, priority: workOrder.priority, dueDate: workOrder.dueDate, assignee: workOrder.assignedToName })))}.`);
  if (allowed.has("inspections:view")) context.push(`Inspections: ${JSON.stringify(listInspections(propertyId).slice(0, 60).map((inspection) => ({ id: inspection.id, unit: inspection.unitNumber, type: inspection.type, status: inspection.status, date: inspection.inspectionDate, findings: inspection.damageItems })))}.`);
  if (allowed.has("inventory:view")) context.push(`Inventory: ${JSON.stringify(listInventory(propertyId).slice(0, 80).map((item) => ({ name: item.name, sku: item.sku, category: item.category, onHand: item.quantityOnHand, reorderAt: item.reorderLevel })))}.`);
  const sources = [...new Map(words(question).flatMap((word) => searchProperty(propertyId, word, allowed)).map((result) => [`${result.type}:${result.id}`, result])).values()].slice(0, 12);
  const prompt = `You are the Property Suite operations assistant. Answer only from the supplied property context. Never invent facts. Never reveal information not present in the context. Do not mention or infer financial amounts, invoices, resident charges, or vendor pricing. If the context does not answer the question, say that clearly and suggest which record the user should open. Keep the answer concise and practical.\n\nQuestion: ${question}\n\nContext:\n${context.join("\n")}`;
  const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), 45_000);
  try {
    const response = await fetch(`${config.ollamaUrl.replace(/\/$/, "")}/api/chat`, { method: "POST", headers: { "Content-Type": "application/json" }, signal: controller.signal, body: JSON.stringify({ model: config.ollamaModel, stream: false, messages: [{ role: "user", content: prompt }] }) });
    if (!response.ok) throw new Error(`Ollama returned ${response.status}`);
    const payload = await response.json() as OllamaChatResponse;
    const answer = payload.message?.content?.trim();
    if (!answer) throw new Error("Ollama returned an empty response");
    return { answer, sources };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") throw new Error("The local assistant took too long to respond. Try a shorter question.");
    throw new Error(`The local assistant is unavailable. Start Ollama and make sure model '${config.ollamaModel}' is installed.`);
  } finally { clearTimeout(timeout); }
}
