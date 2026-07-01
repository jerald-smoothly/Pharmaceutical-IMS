"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Package, X, Pencil, Trash2 } from "lucide-react";
import SearchInput from "@/components/shared/SearchInput";
import NavSelect from "@/components/shared/NavSelect";
import { ColumnPicker, useColumnPicker, ColDef } from "@/components/shared/ColumnPicker";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

const EDIT_FIELDS = [
  { key: "genericName",          label: "Generic Name" },
  { key: "manufacturer",         label: "Manufacturer" },
  { key: "category",             label: "Category" },
  { key: "unit",                 label: "Unit" },
  { key: "unitPrice",            label: "Unit Price" },
  { key: "requiresPrescription", label: "Requires Prescription" },
  { key: "description",          label: "Description" },
];

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
  const router = useRouter();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const allSelected = products.length > 0 && products.every((p) => selectedIds.has(p.id));
  const someSelected = products.some((p) => selectedIds.has(p.id)) && !allSelected;
  const checkAllRef = useRef<HTMLInputElement>(null);

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editStep, setEditStep] = useState<"pick" | "fill">("pick");
  const [pickedFields, setPickedFields] = useState<Set<string>>(new Set());
  const [editGenericName, setEditGenericName] = useState("");
  const [editManufacturer, setEditManufacturer] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editUnit, setEditUnit] = useState("");
  const [editUnitPrice, setEditUnitPrice] = useState("");
  const [editRx, setEditRx] = useState("");

  function closeEdit() {
    setShowEdit(false); setEditStep("pick"); setPickedFields(new Set());
    setEditGenericName(""); setEditManufacturer(""); setEditCategory("");
    setEditDescription(""); setEditUnit(""); setEditUnitPrice(""); setEditRx("");
  }
  function togglePick(key: string) {
    setPickedFields((prev) => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; });
  }

  useEffect(() => { setSelectedIds(new Set()); }, [products]);
  useEffect(() => { if (checkAllRef.current) checkAllRef.current.indeterminate = someSelected; }, [someSelected]);

  function toggleAll() {
    setSelectedIds(allSelected ? new Set() : new Set(products.map((p) => p.id)));
  }
  function toggleOne(id: string) {
    setSelectedIds((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  }

  async function handleDelete() {
    setBulkLoading(true);
    const res = await fetch("/api/inventory/products/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", ids: [...selectedIds] }),
    });
    setBulkLoading(false);
    if (!res.ok) { toast.error("Failed to delete products"); return; }
    toast.success(`${selectedIds.size} product${selectedIds.size > 1 ? "s" : ""} deleted`);
    setSelectedIds(new Set()); setConfirmDelete(false);
    router.refresh();
  }

  async function handleEdit() {
    const data: Record<string, string | boolean | number> = {};
    if (editGenericName.trim())  data.genericName  = editGenericName.trim();
    if (editManufacturer.trim()) data.manufacturer = editManufacturer.trim();
    if (editCategory.trim())     data.category     = editCategory.trim();
    if (editDescription.trim())  data.description  = editDescription.trim();
    if (editUnit.trim())         data.unit         = editUnit.trim();
    if (editUnitPrice.trim()) {
      const price = parseFloat(editUnitPrice);
      if (isNaN(price) || price < 0) { toast.error("Unit price must be a valid number"); return; }
      data.unitPrice = price;
    }
    if (editRx !== "") data.requiresPrescription = editRx === "true";
    if (Object.keys(data).length === 0) { toast.error("No changes to apply"); return; }
    setBulkLoading(true);
    const res = await fetch("/api/inventory/products/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update", ids: [...selectedIds], data }),
    });
    setBulkLoading(false);
    if (!res.ok) { toast.error("Failed to update products"); return; }
    toast.success(`${selectedIds.size} product${selectedIds.size > 1 ? "s" : ""} updated`);
    closeEdit(); setSelectedIds(new Set()); router.refresh();
  }

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

      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm">
          <span className="font-medium mr-auto">{selectedIds.size} selected</span>
          {confirmDelete ? (
            <>
              <span className="opacity-90">Delete {selectedIds.size} product{selectedIds.size > 1 ? "s" : ""}?</span>
              <button onClick={handleDelete} disabled={bulkLoading} className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-md font-medium disabled:opacity-50">
                {bulkLoading ? "Deleting…" : "Confirm"}
              </button>
              <button onClick={() => setConfirmDelete(false)} className="opacity-80 hover:opacity-100">Cancel</button>
            </>
          ) : (
            <>
              <button onClick={() => setShowEdit(true)} className="inline-flex items-center gap-1.5 bg-white/15 hover:bg-white/25 px-3 py-1 rounded-md transition-colors">
                <Pencil className="w-3.5 h-3.5" /> Edit
              </button>
              <button onClick={() => setConfirmDelete(true)} className="inline-flex items-center gap-1.5 bg-white/15 hover:bg-red-500 px-3 py-1 rounded-md transition-colors">
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>
              <button onClick={() => setSelectedIds(new Set())} className="opacity-70 hover:opacity-100 ml-1"><X className="w-4 h-4" /></button>
            </>
          )}
        </div>
      )}

      {showEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={closeEdit}>
          <div className="bg-background rounded-xl shadow-xl w-full max-w-sm p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            {editStep === "pick" ? (
              <>
                <div>
                  <h3 className="font-semibold text-base">Edit {selectedIds.size} Product{selectedIds.size > 1 ? "s" : ""}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Select the attributes you want to change.</p>
                </div>
                <div className="space-y-1">
                  {EDIT_FIELDS.map((f) => (
                    <label key={f.key} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted cursor-pointer select-none">
                      <input type="checkbox" checked={pickedFields.has(f.key)} onChange={() => togglePick(f.key)}
                        className="rounded border-gray-300 text-primary focus:ring-primary/50 cursor-pointer" />
                      <span className="text-sm">{f.label}</span>
                    </label>
                  ))}
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button onClick={closeEdit} className="inline-flex items-center h-8 px-3 rounded-lg text-sm border border-border bg-background hover:bg-muted">Cancel</button>
                  <button onClick={() => setEditStep("fill")} disabled={pickedFields.size === 0}
                    className="inline-flex items-center h-8 px-3 rounded-lg text-sm bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40">
                    Next →
                  </button>
                </div>
              </>
            ) : (
              <>
                <div>
                  <h3 className="font-semibold text-base">Edit {selectedIds.size} Product{selectedIds.size > 1 ? "s" : ""}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Only filled fields will be applied.</p>
                </div>
                <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-1">
                  {pickedFields.has("genericName") && (
                    <div>
                      <label className="text-sm font-medium block mb-1">Generic Name</label>
                      <input value={editGenericName} onChange={(e) => setEditGenericName(e.target.value)} placeholder="e.g. Amoxicillin"
                        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                    </div>
                  )}
                  {pickedFields.has("manufacturer") && (
                    <div>
                      <label className="text-sm font-medium block mb-1">Manufacturer</label>
                      <input value={editManufacturer} onChange={(e) => setEditManufacturer(e.target.value)} placeholder="e.g. Pfizer"
                        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                    </div>
                  )}
                  {pickedFields.has("category") && (
                    <div>
                      <label className="text-sm font-medium block mb-1">Category</label>
                      <input value={editCategory} onChange={(e) => setEditCategory(e.target.value)} placeholder="e.g. Antibiotics"
                        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                    </div>
                  )}
                  {pickedFields.has("unit") && (
                    <div>
                      <label className="text-sm font-medium block mb-1">Unit</label>
                      <input value={editUnit} onChange={(e) => setEditUnit(e.target.value)} placeholder="e.g. box, tablet, vial"
                        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                    </div>
                  )}
                  {pickedFields.has("unitPrice") && (
                    <div>
                      <label className="text-sm font-medium block mb-1">Unit Price (₱)</label>
                      <input type="number" min="0" step="0.01" value={editUnitPrice} onChange={(e) => setEditUnitPrice(e.target.value)} placeholder="0.00"
                        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                    </div>
                  )}
                  {pickedFields.has("requiresPrescription") && (
                    <div>
                      <label className="text-sm font-medium block mb-1">Requires Prescription</label>
                      <select value={editRx} onChange={(e) => setEditRx(e.target.value)}
                        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 bg-background">
                        <option value="">— Select —</option>
                        <option value="true">Yes (Rx)</option>
                        <option value="false">No (OTC)</option>
                      </select>
                    </div>
                  )}
                  {pickedFields.has("description") && (
                    <div>
                      <label className="text-sm font-medium block mb-1">Description</label>
                      <textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} placeholder="Product description…" rows={3}
                        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none" />
                    </div>
                  )}
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button onClick={() => setEditStep("pick")} className="inline-flex items-center h-8 px-3 rounded-lg text-sm border border-border bg-background hover:bg-muted">← Back</button>
                  <button onClick={handleEdit} disabled={bulkLoading} className="inline-flex items-center h-8 px-3 rounded-lg text-sm bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                    {bulkLoading ? "Saving…" : "Apply Changes"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

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
                <th className="w-10 px-4 py-3">
                  <input ref={checkAllRef} type="checkbox" checked={allSelected} onChange={toggleAll}
                    className="rounded border-gray-300 text-primary focus:ring-primary/50 cursor-pointer" />
                </th>
                {visible.has("sku") && <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-muted-foreground">SKU</th>}
                {visible.has("name") && <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-muted-foreground">Name</th>}
                {visible.has("category") && <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-muted-foreground">Category</th>}
                {visible.has("stock") && <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-muted-foreground">Stock</th>}
                {visible.has("rx") && <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-muted-foreground">Rx</th>}
              </tr>
            </thead>
            <tbody className="divide-y">
              {products.map((p) => (
                <tr key={p.id} className={`hover:bg-gray-50 dark:hover:bg-[var(--rx-surface)] ${selectedIds.has(p.id) ? "bg-blue-50 dark:bg-blue-900/10" : ""}`}>
                  <td className="w-10 px-4 py-3">
                    <input type="checkbox" checked={selectedIds.has(p.id)} onChange={() => toggleOne(p.id)}
                      className="rounded border-gray-300 text-primary focus:ring-primary/50 cursor-pointer" />
                  </td>
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
