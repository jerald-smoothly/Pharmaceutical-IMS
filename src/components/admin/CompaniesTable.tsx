"use client";

import Link from "next/link";
import { Building2, Users, ShoppingCart, ChevronUp, ChevronDown, ChevronsUpDown, X, Pencil, Trash2 } from "lucide-react";
import SearchInput from "@/components/shared/SearchInput";
import { ColumnPicker, useColumnPicker, ColDef } from "@/components/shared/ColumnPicker";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

const COLUMNS: ColDef[] = [
  { key: "company", label: "Company" },
  { key: "location", label: "Location" },
  { key: "contacts", label: "Contacts" },
  { key: "orders", label: "Orders" },
];

export interface CompanyRow {
  id: string;
  name: string;
  email: string | null;
  city: string | null;
  state: string | null;
  contactCount: number;
  orderCount: number;
}

type Dir = "asc" | "desc";

function SortHeader({
  label, col, sort, dir, search, show,
}: {
  label: string; col: string; sort: string; dir: Dir; search: string; show: boolean;
}) {
  if (!show) return null;
  const isActive = sort === col;
  const nextDir: Dir = isActive && dir === "asc" ? "desc" : "asc";
  const Icon = isActive ? (dir === "asc" ? ChevronUp : ChevronDown) : ChevronsUpDown;
  return (
    <th className="px-4 py-3 text-left">
      <Link
        href={`?sort=${col}&dir=${nextDir}&search=${encodeURIComponent(search)}&page=1`}
        className={`inline-flex items-center gap-1 text-sm font-medium select-none transition-colors ${
          isActive ? "text-gray-900 dark:text-foreground" : "text-gray-600 hover:text-gray-900 dark:text-muted-foreground dark:hover:text-foreground"
        }`}
      >
        {label}
        <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? "text-blue-600" : "text-gray-400"}`} />
      </Link>
    </th>
  );
}

interface Props {
  companies: CompanyRow[];
  search: string;
  sort: string;
  dir: Dir;
  page: number;
  pages: number;
}

export default function CompaniesTable({ companies, search, sort, dir, page, pages }: Props) {
  const { visible, onChange } = useColumnPicker("rx-cols-companies", COLUMNS);
  const router = useRouter();
  const sh = { sort, dir, search };

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const allSelected = companies.length > 0 && companies.every((c) => selectedIds.has(c.id));
  const someSelected = companies.some((c) => selectedIds.has(c.id)) && !allSelected;
  const checkAllRef = useRef<HTMLInputElement>(null);

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editIndustry, setEditIndustry] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editWebsite, setEditWebsite] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editCity, setEditCity] = useState("");
  const [editState, setEditState] = useState("");
  const [editCountry, setEditCountry] = useState("");
  const [editPostalCode, setEditPostalCode] = useState("");
  const [editTaxId, setEditTaxId] = useState("");
  const [editNotes, setEditNotes] = useState("");

  useEffect(() => { setSelectedIds(new Set()); }, [companies]);
  useEffect(() => { if (checkAllRef.current) checkAllRef.current.indeterminate = someSelected; }, [someSelected]);

  function toggleAll() {
    setSelectedIds(allSelected ? new Set() : new Set(companies.map((c) => c.id)));
  }
  function toggleOne(id: string) {
    setSelectedIds((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  }

  async function handleDelete() {
    setBulkLoading(true);
    const res = await fetch("/api/crm/companies/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", ids: [...selectedIds] }),
    });
    setBulkLoading(false);
    if (!res.ok) { toast.error("Failed to delete companies"); return; }
    toast.success(`${selectedIds.size} compan${selectedIds.size > 1 ? "ies" : "y"} deleted`);
    setSelectedIds(new Set()); setConfirmDelete(false);
    router.refresh();
  }

  async function handleEdit() {
    const data: Record<string, string> = {};
    if (editIndustry.trim())   data.industry   = editIndustry.trim();
    if (editPhone.trim())      data.phone       = editPhone.trim();
    if (editEmail.trim())      data.email       = editEmail.trim();
    if (editWebsite.trim())    data.website     = editWebsite.trim();
    if (editAddress.trim())    data.address     = editAddress.trim();
    if (editCity.trim())       data.city        = editCity.trim();
    if (editState.trim())      data.state       = editState.trim();
    if (editCountry.trim())    data.country     = editCountry.trim();
    if (editPostalCode.trim()) data.postalCode  = editPostalCode.trim();
    if (editTaxId.trim())      data.taxId       = editTaxId.trim();
    if (editNotes.trim())      data.notes       = editNotes.trim();
    if (Object.keys(data).length === 0) { toast.error("No changes to apply"); return; }
    setBulkLoading(true);
    const res = await fetch("/api/crm/companies/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update", ids: [...selectedIds], data }),
    });
    setBulkLoading(false);
    if (!res.ok) { toast.error("Failed to update companies"); return; }
    toast.success(`${selectedIds.size} compan${selectedIds.size > 1 ? "ies" : "y"} updated`);
    setShowEdit(false);
    setEditIndustry(""); setEditPhone(""); setEditEmail(""); setEditWebsite("");
    setEditAddress(""); setEditCity(""); setEditState(""); setEditCountry("");
    setEditPostalCode(""); setEditTaxId(""); setEditNotes("");
    setSelectedIds(new Set());
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-3 items-center">
        <SearchInput
          placeholder="Search by name, email, or city..."
          defaultValue={search}
          preserveParams={{ sort, dir }}
          className="flex-1 border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
        <ColumnPicker columns={COLUMNS} visible={visible} onChange={onChange} />
      </div>

      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm">
          <span className="font-medium mr-auto">{selectedIds.size} selected</span>
          {confirmDelete ? (
            <>
              <span className="opacity-90">Delete {selectedIds.size} compan{selectedIds.size > 1 ? "ies" : "y"}?</span>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowEdit(false)}>
          <div className="bg-background rounded-xl shadow-xl w-full max-w-sm p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold text-base">Edit {selectedIds.size} Compan{selectedIds.size > 1 ? "ies" : "y"}</h3>
            <p className="text-xs text-muted-foreground">Only filled fields will be applied. Leave blank to keep existing values.</p>
            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
              <div>
                <label className="text-sm font-medium block mb-1">Industry</label>
                <input value={editIndustry} onChange={(e) => setEditIndustry(e.target.value)} placeholder="e.g. Healthcare"
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Phone</label>
                <input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} placeholder="+63 2 1234 5678"
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Email</label>
                <input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} placeholder="contact@company.com"
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Website</label>
                <input value={editWebsite} onChange={(e) => setEditWebsite(e.target.value)} placeholder="https://company.com"
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Address</label>
                <input value={editAddress} onChange={(e) => setEditAddress(e.target.value)} placeholder="123 Main St"
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium block mb-1">City</label>
                  <input value={editCity} onChange={(e) => setEditCity(e.target.value)} placeholder="Manila"
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1">State / Province</label>
                  <input value={editState} onChange={(e) => setEditState(e.target.value)} placeholder="Metro Manila"
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium block mb-1">Country</label>
                  <input value={editCountry} onChange={(e) => setEditCountry(e.target.value)} placeholder="Philippines"
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1">Postal Code</label>
                  <input value={editPostalCode} onChange={(e) => setEditPostalCode(e.target.value)} placeholder="1000"
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Tax ID</label>
                <input value={editTaxId} onChange={(e) => setEditTaxId(e.target.value)} placeholder="e.g. 123-456-789"
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Notes</label>
                <textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)} placeholder="Internal notes…" rows={3}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none" />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowEdit(false)} className="inline-flex items-center h-8 px-3 rounded-lg text-sm border border-border bg-background hover:bg-muted">Cancel</button>
              <button onClick={handleEdit} disabled={bulkLoading} className="inline-flex items-center h-8 px-3 rounded-lg text-sm bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                {bulkLoading ? "Saving…" : "Apply Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {companies.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Building2 className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p className="font-medium">No companies yet</p>
          <p className="text-sm mt-1">Add your first company to get started</p>
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
                <SortHeader label="Company"  col="name"     {...sh} show={visible.has("company")} />
                <SortHeader label="Location" col="location" {...sh} show={visible.has("location")} />
                <SortHeader label="Contacts" col="contacts" {...sh} show={visible.has("contacts")} />
                <SortHeader label="Orders"   col="orders"   {...sh} show={visible.has("orders")} />
              </tr>
            </thead>
            <tbody className="divide-y">
              {companies.map((c) => (
                <tr key={c.id} className={`hover:bg-gray-50 dark:hover:bg-[var(--rx-surface)] ${selectedIds.has(c.id) ? "bg-blue-50 dark:bg-blue-900/10" : ""}`}>
                  <td className="w-10 px-4 py-3">
                    <input type="checkbox" checked={selectedIds.has(c.id)} onChange={() => toggleOne(c.id)}
                      className="rounded border-gray-300 text-primary focus:ring-primary/50 cursor-pointer" />
                  </td>
                  {visible.has("company") && (
                    <td className="px-4 py-3">
                      <Link href={`/crm/companies/${c.id}`} className="font-medium text-blue-600 hover:underline">
                        {c.name}
                      </Link>
                      {c.email && <p className="text-xs text-muted-foreground">{c.email}</p>}
                    </td>
                  )}
                  {visible.has("location") && (
                    <td className="px-4 py-3 text-muted-foreground">
                      {[c.city, c.state].filter(Boolean).join(", ") || "—"}
                    </td>
                  )}
                  {visible.has("contacts") && (
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 text-muted-foreground">
                        <Users className="w-3.5 h-3.5" />
                        {c.contactCount}
                      </span>
                    </td>
                  )}
                  {visible.has("orders") && (
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 text-muted-foreground">
                        <ShoppingCart className="w-3.5 h-3.5" />
                        {c.orderCount}
                      </span>
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
              <Link href={`?page=${page - 1}&search=${search}&sort=${sort}&dir=${dir}`} className="inline-flex items-center h-7 px-3 rounded-lg text-sm font-medium border border-border bg-background hover:bg-muted transition-all">
                Previous
              </Link>
            )}
            {page < pages && (
              <Link href={`?page=${page + 1}&search=${search}&sort=${sort}&dir=${dir}`} className="inline-flex items-center h-7 px-3 rounded-lg text-sm font-medium border border-border bg-background hover:bg-muted transition-all">
                Next
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
