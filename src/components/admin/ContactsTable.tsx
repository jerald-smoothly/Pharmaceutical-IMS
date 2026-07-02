"use client";

import Link from "next/link";
import { Users, ChevronUp, ChevronDown, ChevronsUpDown, X, Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import SearchInput from "@/components/shared/SearchInput";
import { ColumnPicker, applyFilters } from "@/components/shared/ColumnPicker";
import type { ColDef, FilterRule } from "@/components/shared/ColumnPicker";
import { EditColumns, useEditColumns } from "@/components/shared/EditColumns";
import { useState, useEffect, useRef, useCallback } from "react";

const EDIT_FIELDS = [
  { key: "title",      label: "Title" },
  { key: "department", label: "Department" },
  { key: "phone",      label: "Phone" },
  { key: "companyId",  label: "Company" },
  { key: "notes",      label: "Notes" },
];

const COLUMNS: ColDef[] = [
  { key: "name",  label: "Name" },
  { key: "title", label: "Job Title" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone Number" },
];

const SORT_KEY: Record<string, string> = {
  name: "name", title: "title", email: "email", phone: "phone",
};

export interface ContactRow {
  id: string;
  firstName: string;
  lastName: string;
  title: string | null;
  email: string;
  phone: string | null;
}

type Dir = "asc" | "desc";

function SortHeader({ label, col, sort, dir, search }: {
  label: string; col: string; sort: string; dir: Dir; search: string;
}) {
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
  contacts: ContactRow[];
  search: string;
  sort: string;
  dir: Dir;
  page: number;
  pages: number;
}

function getContactValue(row: ContactRow, key: string): unknown {
  switch (key) {
    case "name":  return `${row.firstName} ${row.lastName}`;
    case "title": return row.title;
    case "email": return row.email;
    case "phone": return row.phone;
    default:      return null;
  }
}

export default function ContactsTable({ contacts, search, sort, dir, page, pages }: Props) {
  const { orderedVisible, allOrdered, hidden, setOrder, setHidden } =
    useEditColumns("rx-cols-contacts", COLUMNS);
  const [filterRules, setFilterRules] = useState<FilterRule[]>([]);
  const router = useRouter();

  const filtered = applyFilters(contacts, filterRules, getContactValue);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const allSelected = filtered.length > 0 && filtered.every((c) => selectedIds.has(c.id));
  const someSelected = filtered.some((c) => selectedIds.has(c.id)) && !allSelected;
  const checkAllRef = useRef<HTMLInputElement>(null);

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editStep, setEditStep] = useState<"pick" | "fill">("pick");
  const [pickedFields, setPickedFields] = useState<Set<string>>(new Set());
  const [editTitle, setEditTitle] = useState("");
  const [editDepartment, setEditDepartment] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editCompanyId, setEditCompanyId] = useState("");
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([]);

  function closeEdit() {
    setShowEdit(false); setEditStep("pick"); setPickedFields(new Set());
    setEditTitle(""); setEditDepartment(""); setEditPhone(""); setEditNotes(""); setEditCompanyId("");
  }
  function togglePick(key: string) {
    setPickedFields((prev) => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; });
  }

  useEffect(() => { setSelectedIds(new Set()); }, [contacts]);
  useEffect(() => { if (checkAllRef.current) checkAllRef.current.indeterminate = someSelected; }, [someSelected]);

  const fetchCompanies = useCallback(async () => {
    const res = await fetch("/api/crm/companies");
    if (res.ok) {
      const data = await res.json();
      setCompanies(data.companies ?? data);
    }
  }, []);

  useEffect(() => { if (showEdit) fetchCompanies(); }, [showEdit, fetchCompanies]);

  function toggleAll() { setSelectedIds(allSelected ? new Set() : new Set(filtered.map((c) => c.id))); }
  function toggleOne(id: string) {
    setSelectedIds((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  }

  async function handleDelete() {
    setBulkLoading(true);
    const res = await fetch("/api/crm/contacts/bulk", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", ids: [...selectedIds] }),
    });
    setBulkLoading(false);
    if (!res.ok) { toast.error("Failed to delete contacts"); return; }
    toast.success(`${selectedIds.size} contact${selectedIds.size > 1 ? "s" : ""} deleted`);
    setSelectedIds(new Set()); setConfirmDelete(false); router.refresh();
  }

  async function handleEdit() {
    const data: Record<string, string | null> = {};
    if (editTitle.trim()) data.title = editTitle.trim();
    if (editDepartment.trim()) data.department = editDepartment.trim();
    if (editPhone.trim()) data.phone = editPhone.trim();
    if (editNotes.trim()) data.notes = editNotes.trim();
    if (editCompanyId) data.companyId = editCompanyId === "__clear__" ? null : editCompanyId;
    if (Object.keys(data).length === 0) { toast.error("No changes to apply"); return; }
    setBulkLoading(true);
    const res = await fetch("/api/crm/contacts/bulk", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update", ids: [...selectedIds], data }),
    });
    setBulkLoading(false);
    if (!res.ok) { toast.error("Failed to update contacts"); return; }
    toast.success(`${selectedIds.size} contact${selectedIds.size > 1 ? "s" : ""} updated`);
    closeEdit(); setSelectedIds(new Set()); router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-3 items-center">
        <SearchInput
          placeholder="Search by name or email..."
          defaultValue={search}
          preserveParams={{ sort, dir }}
          className="flex-1 border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
        <EditColumns columns={allOrdered} hidden={hidden} onOrder={setOrder} onHidden={setHidden} />
        <ColumnPicker columns={allOrdered} onFilter={setFilterRules} />
      </div>

      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm">
          <span className="font-medium mr-auto">{selectedIds.size} selected</span>
          {confirmDelete ? (
            <>
              <span className="opacity-90">Delete {selectedIds.size} contact{selectedIds.size > 1 ? "s" : ""}?</span>
              <button onClick={handleDelete} disabled={bulkLoading} className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-md font-medium disabled:opacity-50">{bulkLoading ? "Deleting…" : "Confirm"}</button>
              <button onClick={() => setConfirmDelete(false)} className="opacity-80 hover:opacity-100">Cancel</button>
            </>
          ) : (
            <>
              <button onClick={() => setShowEdit(true)} className="inline-flex items-center gap-1.5 bg-white/15 hover:bg-white/25 px-3 py-1 rounded-md transition-colors"><Pencil className="w-3.5 h-3.5" /> Edit</button>
              <button onClick={() => setConfirmDelete(true)} className="inline-flex items-center gap-1.5 bg-white/15 hover:bg-red-500 px-3 py-1 rounded-md transition-colors"><Trash2 className="w-3.5 h-3.5" /> Delete</button>
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
                  <h3 className="font-semibold text-base">Edit {selectedIds.size} Contact{selectedIds.size > 1 ? "s" : ""}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Select the attributes you want to change.</p>
                </div>
                <div className="space-y-1">
                  {EDIT_FIELDS.map((f) => (
                    <label key={f.key} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted cursor-pointer select-none">
                      <input type="checkbox" checked={pickedFields.has(f.key)} onChange={() => togglePick(f.key)} className="rounded border-gray-300 text-primary focus:ring-primary/50 cursor-pointer" />
                      <span className="text-sm">{f.label}</span>
                    </label>
                  ))}
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button onClick={closeEdit} className="inline-flex items-center h-8 px-3 rounded-lg text-sm border border-border bg-background hover:bg-muted">Cancel</button>
                  <button onClick={() => setEditStep("fill")} disabled={pickedFields.size === 0} className="inline-flex items-center h-8 px-3 rounded-lg text-sm bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40">Next →</button>
                </div>
              </>
            ) : (
              <>
                <div>
                  <h3 className="font-semibold text-base">Edit {selectedIds.size} Contact{selectedIds.size > 1 ? "s" : ""}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Only filled fields will be applied.</p>
                </div>
                <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-1">
                  {pickedFields.has("title") && (
                    <div><label className="text-sm font-medium block mb-1">Title</label>
                      <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} placeholder="e.g. Procurement Manager" className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" /></div>
                  )}
                  {pickedFields.has("department") && (
                    <div><label className="text-sm font-medium block mb-1">Department</label>
                      <input value={editDepartment} onChange={(e) => setEditDepartment(e.target.value)} placeholder="e.g. Finance" className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" /></div>
                  )}
                  {pickedFields.has("phone") && (
                    <div><label className="text-sm font-medium block mb-1">Phone</label>
                      <input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} placeholder="+63 912 345 6789" className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" /></div>
                  )}
                  {pickedFields.has("companyId") && (
                    <div><label className="text-sm font-medium block mb-1">Company</label>
                      <select value={editCompanyId} onChange={(e) => setEditCompanyId(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 bg-background">
                        <option value="">— No change —</option>
                        <option value="__clear__">Remove company assignment</option>
                        {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select></div>
                  )}
                  {pickedFields.has("notes") && (
                    <div><label className="text-sm font-medium block mb-1">Notes</label>
                      <textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)} placeholder="Internal notes…" rows={3} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none" /></div>
                  )}
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button onClick={() => setEditStep("pick")} className="inline-flex items-center h-8 px-3 rounded-lg text-sm border border-border bg-background hover:bg-muted">← Back</button>
                  <button onClick={handleEdit} disabled={bulkLoading} className="inline-flex items-center h-8 px-3 rounded-lg text-sm bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50">{bulkLoading ? "Saving…" : "Apply Changes"}</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Users className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p className="font-medium">No contacts yet</p>
          <p className="text-sm mt-1">Add your first contact to get started</p>
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-[var(--rx-surface)]">
              <tr>
                <th className="w-10 px-4 py-3">
                  <input ref={checkAllRef} type="checkbox" checked={allSelected} onChange={toggleAll} className="rounded border-gray-300 text-primary focus:ring-primary/50 cursor-pointer" />
                </th>
                {orderedVisible.map((col) => (
                  <SortHeader key={col.key} label={col.label} col={SORT_KEY[col.key] ?? col.key} sort={sort} dir={dir} search={search} />
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((c) => (
                <tr key={c.id} className={`hover:bg-gray-50 dark:hover:bg-[var(--rx-surface)] ${selectedIds.has(c.id) ? "bg-blue-50 dark:bg-blue-900/10" : ""}`}>
                  <td className="w-10 px-4 py-3">
                    <input type="checkbox" checked={selectedIds.has(c.id)} onChange={() => toggleOne(c.id)} className="rounded border-gray-300 text-primary focus:ring-primary/50 cursor-pointer" />
                  </td>
                  {orderedVisible.map((col) => {
                    switch (col.key) {
                      case "name":
                        return (
                          <td key="name" className="px-4 py-3">
                            <Link href={`/crm/contacts/${c.id}`} className="font-medium text-blue-600 hover:underline">{c.firstName} {c.lastName}</Link>
                          </td>
                        );
                      case "title":
                        return <td key="title" className="px-4 py-3 text-muted-foreground">{c.title ?? "—"}</td>;
                      case "email":
                        return (
                          <td key="email" className="px-4 py-3">
                            <a href={`mailto:${c.email}`} className="text-muted-foreground hover:text-foreground">{c.email}</a>
                          </td>
                        );
                      case "phone":
                        return <td key="phone" className="px-4 py-3 text-muted-foreground">{c.phone ?? "—"}</td>;
                      default: return null;
                    }
                  })}
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
            {page > 1 && <Link href={`?page=${page - 1}&search=${search}&sort=${sort}&dir=${dir}`} className="inline-flex items-center h-7 px-3 rounded-lg text-sm font-medium border border-border bg-background hover:bg-muted transition-all">Previous</Link>}
            {page < pages && <Link href={`?page=${page + 1}&search=${search}&sort=${sort}&dir=${dir}`} className="inline-flex items-center h-7 px-3 rounded-lg text-sm font-medium border border-border bg-background hover:bg-muted transition-all">Next</Link>}
          </div>
        </div>
      )}
    </div>
  );
}
