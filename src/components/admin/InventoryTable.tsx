"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Package } from "lucide-react";
import SearchInput from "@/components/shared/SearchInput";
import NavSelect from "@/components/shared/NavSelect";
import { ColumnPicker, useColumnPicker, ColDef } from "@/components/shared/ColumnPicker";

const COLUMNS: ColDef[] = [
  { key: "sku", label: "SKU" },
  { key: "name", label: "Name" },
  { key: "category", label: "Category" },
  { key: "stock", label: "Stock" },
  { key: "rx", label: "Rx" },
];

export interface ProductRow {
  id: string;
  sku: string;
  name: string;
  genericName: string | null;
  category: string | null;
  unitPrice: number;
  unit: string | null;
  requiresPrescription: boolean;
  stock: number;
  earliestExpiry: string | null;
}

interface Props {
  products: ProductRow[];
  search: string;
  expiry: string;
  page: number;
  pages: number;
}

export default function InventoryTable({ products, search, expiry, page, pages }: Props) {
  const { visible, onChange } = useColumnPicker("rx-cols-inventory", COLUMNS);

  return (
    <div className="space-y-4">
      <div className="flex gap-3 flex-wrap items-center">
        <SearchInput
          placeholder="Search by name, SKU, or generic name..."
          defaultValue={search}
          preserveParams={{ expiry }}
          className="flex-1 min-w-48 border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
        <NavSelect
          name="expiry"
          defaultValue={expiry}
          preserveParams={{ search }}
          className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 bg-background"
        >
          <option value="">All Expiry Dates</option>
          <option value="30">Expiring in 30 days</option>
          <option value="60">Expiring in 60 days</option>
          <option value="90">Expiring in 90 days</option>
          <option value="expired">Already Expired</option>
        </NavSelect>
        <ColumnPicker columns={COLUMNS} visible={visible} onChange={onChange} />
      </div>

      {products.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Package className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p className="font-medium">No products found</p>
          <p className="text-sm mt-1">Import stock to get started</p>
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-[var(--rx-surface)]">
              <tr>
                {visible.has("sku") && <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-muted-foreground">SKU</th>}
                {visible.has("name") && <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-muted-foreground">Name</th>}
                {visible.has("category") && <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-muted-foreground">Category</th>}
                {visible.has("stock") && <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-muted-foreground">Stock</th>}
                {visible.has("rx") && <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-muted-foreground">Rx</th>}
              </tr>
            </thead>
            <tbody className="divide-y">
              {products.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-[var(--rx-surface)]">
                    {visible.has("sku") && <td className="px-4 py-3 font-mono text-xs text-gray-500">{p.sku}</td>}
                    {visible.has("name") && (
                      <td className="px-4 py-3">
                        <p className="font-medium">{p.name}</p>
                        {p.genericName && <p className="text-xs text-muted-foreground">{p.genericName}</p>}
                      </td>
                    )}
                    {visible.has("category") && <td className="px-4 py-3 text-muted-foreground">{p.category ?? "—"}</td>}
                    {visible.has("stock") && (
                      <td className="px-4 py-3">
                        <span className={`font-medium ${p.stock === 0 ? "text-red-600" : p.stock < 10 ? "text-amber-600" : "text-green-700"}`}>
                          {p.stock} {p.unit}
                        </span>
                      </td>
                    )}
                    {visible.has("rx") && (
                      <td className="px-4 py-3">
                        {p.requiresPrescription ? (
                          <Badge variant="outline" className="text-blue-600 border-blue-300 text-xs">Rx</Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">OTC</span>
                        )}
                      </td>
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
            {page > 1 && (
              <Link href={`?page=${page - 1}&search=${search}&expiry=${expiry}`} className="inline-flex items-center h-7 px-2.5 rounded-lg text-sm font-medium border border-border bg-background hover:bg-muted transition-all">
                Previous
              </Link>
            )}
            {page < pages && (
              <Link href={`?page=${page + 1}&search=${search}&expiry=${expiry}`} className="inline-flex items-center h-7 px-2.5 rounded-lg text-sm font-medium border border-border bg-background hover:bg-muted transition-all">
                Next
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
