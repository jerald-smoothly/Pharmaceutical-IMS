"use client";

import Link from "next/link";
import { ShoppingCart, X } from "lucide-react";
import { ColumnPicker, useColumnPicker, ColDef } from "@/components/shared/ColumnPicker";
import { useState, useEffect, useRef } from "react";

const COLUMNS: ColDef[] = [
  { key: "orderNumber", label: "Order #" },
  { key: "customer", label: "Customer" },
  { key: "items", label: "Items" },
  { key: "total", label: "Total" },
  { key: "status", label: "Status" },
  { key: "date", label: "Date" },
];

const STATUS_COLORS: Record<string, string> = {
  PENDING:    "bg-yellow-100 text-yellow-800 dark:bg-yellow-500/15 dark:text-yellow-400",
  CONFIRMED:  "bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-400",
  PROCESSING: "bg-purple-100 text-purple-800 dark:bg-purple-500/15 dark:text-purple-400",
  SHIPPED:    "bg-indigo-100 text-indigo-800 dark:bg-indigo-500/15 dark:text-indigo-400",
  DELIVERED:  "bg-green-100 text-green-800 dark:bg-green-500/15 dark:text-green-400",
  CANCELLED:  "bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-400",
};

export interface OrderRow {
  id: string;
  orderNumber: string;
  status: string;
  totalAmount: number;
  placedAt: string;
  itemCount: number;
  company: { name: string } | null;
  contact: { firstName: string; lastName: string } | null;
}

interface Props {
  orders: OrderRow[];
  status: string;
  page: number;
  pages: number;
}

export default function OrdersTable({ orders, status, page, pages }: Props) {
  const { visible, onChange } = useColumnPicker("rx-cols-orders", COLUMNS);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const allSelected = orders.length > 0 && orders.every((o) => selectedIds.has(o.id));
  const someSelected = orders.some((o) => selectedIds.has(o.id)) && !allSelected;
  const checkAllRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setSelectedIds(new Set()); }, [orders]);
  useEffect(() => { if (checkAllRef.current) checkAllRef.current.indeterminate = someSelected; }, [someSelected]);

  function toggleAll() {
    setSelectedIds(allSelected ? new Set() : new Set(orders.map((o) => o.id)));
  }
  function toggleOne(id: string) {
    setSelectedIds((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <ColumnPicker columns={COLUMNS} visible={visible} onChange={onChange} />
      </div>

      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm">
          <span className="font-medium">{selectedIds.size} selected</span>
          <button onClick={() => setSelectedIds(new Set())} className="inline-flex items-center gap-1 opacity-80 hover:opacity-100 transition-opacity">
            <X className="w-3.5 h-3.5" /> Clear
          </button>
        </div>
      )}

      {orders.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <ShoppingCart className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p className="font-medium">No orders found</p>
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-[var(--rx-surface)]">
              <tr>
                <th className="w-10 px-4 py-3">
                  <input ref={checkAllRef} type="checkbox" checked={allSelected} onChange={toggleAll}
                    className="rounded border-gray-300 text-primary focus:ring-primary/50 cursor-pointer" />
                </th>
                {visible.has("orderNumber") && <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-muted-foreground">Order #</th>}
                {visible.has("customer")    && <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-muted-foreground">Customer</th>}
                {visible.has("items")       && <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-muted-foreground">Items</th>}
                {visible.has("total")       && <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-muted-foreground">Total</th>}
                {visible.has("status")      && <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-muted-foreground">Status</th>}
                {visible.has("date")        && <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-muted-foreground">Date</th>}
              </tr>
            </thead>
            <tbody className="divide-y">
              {orders.map((o) => (
                <tr key={o.id} className={`hover:bg-gray-50 dark:hover:bg-[var(--rx-surface)] ${selectedIds.has(o.id) ? "bg-blue-50 dark:bg-blue-900/10" : ""}`}>
                  <td className="w-10 px-4 py-3">
                    <input type="checkbox" checked={selectedIds.has(o.id)} onChange={() => toggleOne(o.id)}
                      className="rounded border-gray-300 text-primary focus:ring-primary/50 cursor-pointer" />
                  </td>
                  {visible.has("orderNumber") && (
                    <td className="px-4 py-3">
                      <Link href={`/orders/${o.id}`} className="font-medium text-blue-600 hover:underline">{o.orderNumber}</Link>
                    </td>
                  )}
                  {visible.has("customer") && (
                    <td className="px-4 py-3">
                      <p className="font-medium">
                        {o.company?.name ?? (o.contact ? `${o.contact.firstName} ${o.contact.lastName}` : "Unknown")}
                      </p>
                      {o.company && o.contact && (
                        <p className="text-xs text-muted-foreground">{o.contact.firstName} {o.contact.lastName}</p>
                      )}
                    </td>
                  )}
                  {visible.has("items")  && <td className="px-4 py-3 text-muted-foreground">{o.itemCount} units</td>}
                  {visible.has("total")  && <td className="px-4 py-3 font-medium">${o.totalAmount.toFixed(2)}</td>}
                  {visible.has("status") && (
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[o.status] ?? ""}`}>
                        {o.status.charAt(0) + o.status.slice(1).toLowerCase()}
                      </span>
                    </td>
                  )}
                  {visible.has("date") && (
                    <td className="px-4 py-3 text-muted-foreground">{new Date(o.placedAt).toLocaleDateString()}</td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Page {page} of {pages}</span>
          <div className="flex gap-2">
            {page > 1 && <Link href={`?status=${status}&page=${page - 1}`} className="inline-flex items-center h-7 px-3 rounded-lg text-sm font-medium border border-border bg-background hover:bg-muted transition-all">Previous</Link>}
            {page < pages && <Link href={`?status=${status}&page=${page + 1}`} className="inline-flex items-center h-7 px-3 rounded-lg text-sm font-medium border border-border bg-background hover:bg-muted transition-all">Next</Link>}
          </div>
        </div>
      )}
    </div>
  );
}
