"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

const transitions: Record<string, string[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PROCESSING", "CANCELLED"],
  PROCESSING: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED"],
  DELIVERED: [],
  CANCELLED: [],
};

const labels: Record<string, string> = {
  CONFIRMED: "Confirm Order",
  PROCESSING: "Mark Processing",
  SHIPPED: "Mark Shipped",
  DELIVERED: "Mark Delivered",
  CANCELLED: "Cancel Order",
};

const colors: Record<string, string> = {
  CONFIRMED: "bg-blue-600 text-white hover:bg-blue-700",
  PROCESSING: "bg-purple-600 text-white hover:bg-purple-700",
  SHIPPED: "bg-indigo-600 text-white hover:bg-indigo-700",
  DELIVERED: "bg-green-600 text-white hover:bg-green-700",
  CANCELLED: "border border-red-300 text-red-600 hover:bg-red-50",
};

export default function OrderStatusUpdater({ orderId, currentStatus }: { orderId: string; currentStatus: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const next = transitions[currentStatus] ?? [];

  if (next.length === 0) return null;

  async function update(status: string) {
    setLoading(status);
    const res = await fetch(`/api/orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setLoading(null);

    if (!res.ok) {
      toast.error("Failed to update order status");
      return;
    }
    toast.success(`Order marked as ${status}`);
    router.refresh();
  }

  return (
    <div className="flex gap-2 flex-wrap">
      {next.map((status) => (
        <button
          key={status}
          onClick={() => update(status)}
          disabled={loading !== null}
          className={`inline-flex items-center h-8 px-3 rounded-lg text-sm font-medium transition-all disabled:opacity-50 ${colors[status]}`}
        >
          {loading === status ? "Updating..." : labels[status]}
        </button>
      ))}
    </div>
  );
}
