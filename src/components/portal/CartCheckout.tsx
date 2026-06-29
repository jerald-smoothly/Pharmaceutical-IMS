"use client";

import { useCart } from "@/lib/cart-store";
import { Trash2, ShoppingCart, Minus, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function CartCheckout() {
  const { items, removeItem, updateQuantity, clear, total } = useCart();
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  if (items.length === 0) return null;

  async function placeOrder() {
    setLoading(true);
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        notes,
        items: items.map((i) => ({ productId: i.id, quantity: i.quantity })),
      }),
    });

    setLoading(false);

    if (!res.ok) {
      const err = await res.json();
      toast.error(err.error ?? "Failed to place order");
      return;
    }

    const order = await res.json();
    clear();
    toast.success(`Order ${order.orderNumber} placed successfully!`);
    router.refresh();
  }

  return (
    <div className="bg-white rounded-xl border">
      <div className="p-4 border-b flex items-center gap-2">
        <ShoppingCart className="w-5 h-5 text-blue-600" />
        <h2 className="font-semibold text-gray-900">Current Order ({items.length} item{items.length !== 1 ? "s" : ""})</h2>
      </div>

      <div className="divide-y">
        {items.map((item) => (
          <div key={item.id} className="px-4 py-3 flex items-center gap-4">
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{item.name}</p>
              <p className="text-xs text-muted-foreground">${item.unitPrice.toFixed(2)} / {item.unit}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => updateQuantity(item.id, item.quantity - 1)}
                className="w-6 h-6 rounded border flex items-center justify-center hover:bg-gray-100 transition-colors"
              >
                <Minus className="w-3 h-3" />
              </button>
              <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
              <button
                onClick={() => updateQuantity(item.id, Math.min(item.quantity + 1, item.stock))}
                className="w-6 h-6 rounded border flex items-center justify-center hover:bg-gray-100 transition-colors"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
            <p className="w-20 text-right text-sm font-medium">${(item.unitPrice * item.quantity).toFixed(2)}</p>
            <button onClick={() => removeItem(item.id)} className="text-gray-400 hover:text-red-500 transition-colors">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      <div className="p-4 border-t space-y-3">
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Order notes (optional)..."
          rows={2}
          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Total</p>
            <p className="text-xl font-bold text-gray-900">${total().toFixed(2)}</p>
          </div>
          <button
            onClick={placeOrder}
            disabled={loading}
            className="inline-flex items-center gap-2 h-10 px-6 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-all disabled:opacity-50"
          >
            {loading ? "Placing Order..." : "Place Order"}
          </button>
        </div>
      </div>
    </div>
  );
}
