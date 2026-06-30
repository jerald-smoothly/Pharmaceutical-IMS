"use client";

import { useState } from "react";
import { ShoppingCart, Check } from "lucide-react";
import { useCart } from "@/lib/cart-store";

interface Product {
  id: string;
  name: string;
  unitPrice: number;
  unit: string;
  stock: number;
}

export default function AddToCartButton({ product }: { product: Product }) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);

  if (product.stock === 0) {
    return (
      <button disabled className="w-full h-8 rounded-lg text-sm font-medium bg-gray-100 text-gray-400 cursor-not-allowed">
        Out of Stock
      </button>
    );
  }

  const handleAdd = () => {
    addItem(product);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  return (
    <button
      onClick={handleAdd}
      className={`w-full h-8 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-1.5 ${
        added
          ? "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400"
          : "bg-primary text-primary-foreground hover:bg-primary/90"
      }`}
    >
      {added ? (
        <><Check className="w-3.5 h-3.5" /> Added</>
      ) : (
        <><ShoppingCart className="w-3.5 h-3.5" /> Add to Order</>
      )}
    </button>
  );
}
