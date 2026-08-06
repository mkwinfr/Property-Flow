import type { TurnPriority, TurnStatus } from "../../shared/contracts";

export function StatusBadge({ status }: { status: TurnStatus }) {
  return <span className={`badge badge--${status}`}>{status.replaceAll("_", " ")}</span>;
}

export function PriorityBadge({ priority }: { priority: TurnPriority }) {
  return <span className={`priority priority--${priority}`}>{priority}</span>;
}

