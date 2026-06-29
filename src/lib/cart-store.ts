"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface CartItem {
  id: string;
  name: string;
  unitPrice: number;
  unit: string;
  stock: number;
  quantity: number;
}

interface CartStore {
  items: CartItem[];
  addItem: (product: Omit<CartItem, "quantity">) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clear: () => void;
  total: () => number;
}

export const useCart = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (product) =>
        set((state) => {
          const existing = state.items.find((i) => i.id === product.id);
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.id === product.id
                  ? { ...i, quantity: Math.min(i.quantity + 1, product.stock) }
                  : i
              ),
            };
          }
          return { items: [...state.items, { ...product, quantity: 1 }] };
        }),
      removeItem: (id) => set((state) => ({ items: state.items.filter((i) => i.id !== id) })),
      updateQuantity: (id, quantity) =>
        set((state) => ({
          items:
            quantity <= 0
              ? state.items.filter((i) => i.id !== id)
              : state.items.map((i) => (i.id === id ? { ...i, quantity } : i)),
        })),
      clear: () => set({ items: [] }),
      total: () => get().items.reduce((s, i) => s + i.unitPrice * i.quantity, 0),
    }),
    { name: "pharmaflow-cart" }
  )
);
