import type { OrderStatus } from "@/lib/mock/types";
import { statusLabel } from "@/lib/utils";

const statusClass: Record<OrderStatus, string> = {
  new: "bg-orange-100 text-orange-700",
  confirmed: "bg-blue-100 text-blue-700",
  processing: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-slate-100 text-slate-500",
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span className={`rounded-lg px-3 py-1 text-xs font-bold ${statusClass[status]}`}>
      {statusLabel(status)}
    </span>
  );
}