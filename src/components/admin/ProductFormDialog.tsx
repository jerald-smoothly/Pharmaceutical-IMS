"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

const UNITS = ["box", "strip", "tablet", "capsule", "vial", "bottle", "ampule", "sachet", "tube", "piece"];

interface Props {
  children: React.ReactNode;
}

export default function ProductFormDialog({ children }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rxRequired, setRxRequired] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const fd = new FormData(e.currentTarget);
    const data: Record<string, unknown> = {};
    fd.forEach((v, k) => {
      const val = String(v).trim();
      if (val) data[k] = val;
    });

    data.requiresPrescription = rxRequired;

    const res = await fetch("/api/inventory/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    setLoading(false);

    if (!res.ok) {
      const err = await res.json();
      toast.error(typeof err.error === "string" ? err.error : "Failed to create product");
      return;
    }

    toast.success("Product created");
    setOpen(false);
    setRxRequired(false);
    router.refresh();
  }

  return (
    <>
      <span onClick={() => setOpen(true)} className="cursor-pointer">{children}</span>
      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setRxRequired(false); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Product</DialogTitle>
          </DialogHeader>
          <form onSubmit={onSubmit} className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-4">

              <div className="col-span-2">
                <label className="text-sm font-medium text-gray-700 block mb-1">SKU *</label>
                <input
                  name="sku"
                  required
                  onBlur={(e) => { e.target.value = e.target.value.trim().toUpperCase(); }}
                  className="w-full border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                />
                <p className="text-xs text-muted-foreground mt-1">Must be unique. Auto-uppercased.</p>
              </div>

              <div className="col-span-2">
                <label className="text-sm font-medium text-gray-700 block mb-1">Product Name *</label>
                <input
                  name="name"
                  required
                  minLength={2}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Generic Name</label>
                <input
                  name="genericName"
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Manufacturer</label>
                <input
                  name="manufacturer"
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Category</label>
                <input
                  name="category"
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Unit Price *</label>
                <input
                  name="unitPrice"
                  type="number"
                  required
                  min="0.01"
                  step="0.01"
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Unit</label>
                <select
                  name="unit"
                  defaultValue="box"
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  {UNITS.map((u) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>

              <div className="col-span-2">
                <label className="text-sm font-medium text-gray-700 block mb-1">Description</label>
                <textarea
                  name="description"
                  rows={2}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <div className="col-span-2">
                <label className="flex items-center gap-3 cursor-pointer select-none">
                  <div
                    role="checkbox"
                    aria-checked={rxRequired}
                    onClick={() => setRxRequired((v) => !v)}
                    className={`w-10 h-6 rounded-full transition-colors flex items-center px-0.5 ${rxRequired ? "bg-blue-600" : "bg-gray-200"}`}
                  >
                    <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${rxRequired ? "translate-x-4" : "translate-x-0"}`} />
                  </div>
                  <span className="text-sm font-medium text-gray-700">Requires Prescription (Rx)</span>
                </label>
              </div>

            </div>

            <div className="flex justify-end gap-3 pt-2 border-t">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex items-center h-8 px-3 rounded-lg text-sm font-medium border border-border bg-background hover:bg-muted transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center h-8 px-4 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/80 transition-all disabled:opacity-50"
              >
                {loading ? "Creating..." : "Create Product"}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
