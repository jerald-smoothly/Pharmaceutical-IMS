"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";

export interface ProductOption {
  id: string;
  name: string;
  sku: string;
  unitPrice: number;
  unit: string;
  stock: number;
}

export interface ContactOption {
  id: string;
  firstName: string;
  lastName: string;
}

export interface CompanyOption {
  id: string;
  name: string;
}

interface OrderItem {
  productId: string;
  quantity: number;
}

interface Props {
  children: React.ReactNode;
  products: ProductOption[];
  contacts: ContactOption[];
  companies: CompanyOption[];
}

const inputClass = "w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

export default function OrderFormDialog({ children, products, contacts, companies }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [contactId, setContactId] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<OrderItem[]>([{ productId: "", quantity: 1 }]);

  function reset() {
    setContactId(""); setCompanyId(""); setNotes("");
    setItems([{ productId: "", quantity: 1 }]);
  }

  function addItem() {
    setItems((prev) => [...prev, { productId: "", quantity: 1 }]);
  }

  function removeItem(i: number) {
    setItems((prev) => prev.filter((_, idx) => idx !== i));
  }

  function updateItem(i: number, field: keyof OrderItem, value: string | number) {
    setItems((prev) => prev.map((item, idx) => idx === i ? { ...item, [field]: value } : item));
  }

  function getProduct(id: string) {
    return products.find((p) => p.id === id);
  }

  const total = items.reduce((sum, item) => {
    const p = getProduct(item.productId);
    return sum + (p ? p.unitPrice * item.quantity : 0);
  }, 0);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const validItems = items.filter((i) => i.productId && i.quantity > 0);
    if (validItems.length === 0) {
      toast.error("Add at least one item");
      return;
    }

    setLoading(true);
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contactId: contactId || undefined,
        companyId: companyId || undefined,
        notes: notes.trim() || undefined,
        items: validItems,
      }),
    });
    setLoading(false);

    if (!res.ok) {
      const err = await res.json();
      toast.error(typeof err.error === "string" ? err.error : "Failed to create order");
      return;
    }

    toast.success("Order created");
    setOpen(false);
    reset();
    router.refresh();
  }

  return (
    <>
      <span onClick={() => setOpen(true)} className="cursor-pointer">{children}</span>
      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Order</DialogTitle>
          </DialogHeader>
          <form onSubmit={onSubmit} className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Contact</label>
                <select value={contactId} onChange={(e) => setContactId(e.target.value)} className={`${inputClass} bg-white`}>
                  <option value="">— None —</option>
                  {contacts.map((c) => (
                    <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Company</label>
                <select value={companyId} onChange={(e) => setCompanyId(e.target.value)} className={`${inputClass} bg-white`}>
                  <option value="">— None —</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">Items *</label>
                <button type="button" onClick={addItem}
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                  <Plus className="w-3 h-3" /> Add Item
                </button>
              </div>
              <div className="space-y-2">
                {items.map((item, i) => {
                  const product = getProduct(item.productId);
                  return (
                    <div key={i} className="flex items-center gap-2">
                      <select
                        value={item.productId}
                        onChange={(e) => updateItem(i, "productId", e.target.value)}
                        className={`${inputClass} flex-1 bg-white`}
                      >
                        <option value="">Select product…</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id} disabled={p.stock === 0}>
                            {p.name} — {p.sku} ({p.stock} {p.unit}s in stock)
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        min={1}
                        max={product?.stock}
                        value={item.quantity}
                        onChange={(e) => updateItem(i, "quantity", Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-20 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-center"
                      />
                      {product && (
                        <span className="text-xs text-muted-foreground w-20 text-right shrink-0">
                          ${(product.unitPrice * item.quantity).toFixed(2)}
                        </span>
                      )}
                      {items.length > 1 && (
                        <button type="button" onClick={() => removeItem(i)} className="text-red-400 hover:text-red-600 shrink-0">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
              {total > 0 && (
                <div className="flex justify-end mt-3 text-sm font-semibold">
                  Total: ${total.toFixed(2)}
                </div>
              )}
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Notes</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t">
              <button type="button" onClick={() => setOpen(false)}
                className="inline-flex items-center h-8 px-3 rounded-lg text-sm font-medium border border-border bg-background hover:bg-muted transition-all">
                Cancel
              </button>
              <button type="submit" disabled={loading}
                className="inline-flex items-center h-8 px-3 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/80 transition-all disabled:opacity-50">
                {loading ? "Creating..." : "Create Order"}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
