"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

const UNITS = ["box", "strip", "tablet", "capsule", "vial", "bottle", "ampule", "sachet", "tube", "piece"];

const CATEGORIES = [
  "Analgesics",
  "Antibiotics",
  "Antivirals",
  "Antifungals",
  "Antiparasitics",
  "Cardiovascular",
  "Dermatology",
  "Diabetes & Endocrinology",
  "Gastrointestinal",
  "Immunology",
  "Neurology & CNS",
  "Oncology",
  "Ophthalmology",
  "Psychiatric & Mental Health",
  "Respiratory",
  "Vitamins & Supplements",
  "Vaccines",
  "Others",
];

const inputClass = "w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

function formatExpiryInput(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

function isValidExpiry(value: string): boolean {
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(value)) return false;
  const [m, d, y] = value.split("/").map(Number);
  if (m < 1 || m > 12 || d < 1 || d > 31 || y < 2000) return false;
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

interface Props {
  children: React.ReactNode;
}

export default function ProductFormDialog({ children }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rxRequired, setRxRequired] = useState(false);
  const [expiryDate, setExpiryDate] = useState("");
  const [expiryError, setExpiryError] = useState("");

  function resetForm() {
    setRxRequired(false);
    setExpiryDate("");
    setExpiryError("");
  }

  function handleExpiryChange(raw: string) {
    const formatted = formatExpiryInput(raw);
    setExpiryDate(formatted);
    if (expiryError && formatted.length === 10) {
      setExpiryError(isValidExpiry(formatted) ? "" : "Invalid date.");
    } else {
      setExpiryError("");
    }
  }

  function handleExpiryBlur() {
    if (!expiryDate) return;
    if (!isValidExpiry(expiryDate)) {
      setExpiryError("Enter a valid date in MM/DD/YYYY format.");
    } else {
      setExpiryError("");
    }
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (expiryDate && !isValidExpiry(expiryDate)) {
      setExpiryError("Enter a valid date in MM/DD/YYYY format.");
      toast.error("Please fix the expiry date.");
      return;
    }

    setLoading(true);

    const fd = new FormData(e.currentTarget);
    const data: Record<string, unknown> = {};
    fd.forEach((v, k) => {
      const val = String(v).trim();
      if (val) data[k] = val;
    });

    data.requiresPrescription = rxRequired;

    if (expiryDate) {
      data.expiryDate = expiryDate;
    }

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
    resetForm();
    router.refresh();
  }

  return (
    <>
      <span onClick={() => setOpen(true)} className="cursor-pointer">{children}</span>
      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
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
                  className={`${inputClass} font-mono uppercase`}
                />
                <p className="text-xs text-muted-foreground mt-1">Must be unique. Auto-uppercased.</p>
              </div>

              <div className="col-span-2">
                <label className="text-sm font-medium text-gray-700 block mb-1">Product Name *</label>
                <input name="name" required minLength={2} className={inputClass} />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Manufacturer</label>
                <input name="manufacturer" className={inputClass} />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Category</label>
                <select name="category" defaultValue="" className={`${inputClass} bg-white`}>
                  <option value="">— Select —</option>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Unit</label>
                <select name="unit" defaultValue="" className={`${inputClass} bg-white`}>
                  <option value="">— Select —</option>
                  {UNITS.map((u) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Expiry Date</label>
                <input
                  type="text"
                  value={expiryDate}
                  onChange={(e) => handleExpiryChange(e.target.value)}
                  onBlur={handleExpiryBlur}
                  maxLength={10}
                  className={`${inputClass}${expiryError ? " border-red-400 focus:ring-red-400" : ""}`}
                />
                {expiryError ? (
                  <p className="text-xs text-red-500 mt-1">{expiryError}</p>
                ) : (
                  <p className="text-xs text-muted-foreground mt-1">MM/DD/YYYY</p>
                )}
              </div>

              <div className="col-span-2">
                <label className="text-sm font-medium text-gray-700 block mb-1">Stock</label>
                <input
                  name="initialStock"
                  type="number"
                  min="0"
                  step="1"
                  className={inputClass}
                />
                <p className="text-xs text-muted-foreground mt-1">Units currently on hand. Leave blank to add stock later.</p>
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
