"use client";

import Link from "next/link";
import { Users, ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import SearchInput from "@/components/shared/SearchInput";
import { ColumnPicker, useColumnPicker, ColDef } from "@/components/shared/ColumnPicker";

const COLUMNS: ColDef[] = [
  { key: "name", label: "Name" },
  { key: "company", label: "Company" },
  { key: "title", label: "Title" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
];

export interface ContactRow {
  id: string;
  firstName: string;
  lastName: string;
  title: string | null;
  email: string;
  phone: string | null;
  company: { id: string; name: string } | null;
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
  contacts: ContactRow[];
  search: string;
  sort: string;
  dir: Dir;
  page: number;
  pages: number;
}

export default function ContactsTable({ contacts, search, sort, dir, page, pages }: Props) {
  const { visible, onChange } = useColumnPicker("rx-cols-contacts", COLUMNS);
  const sh = { sort, dir, search };

  return (
    <div className="space-y-4">
      <div className="flex gap-3 items-center">
        <SearchInput
          placeholder="Search by name or email..."
          defaultValue={search}
          preserveParams={{ sort, dir }}
          className="flex-1 border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
        <ColumnPicker columns={COLUMNS} visible={visible} onChange={onChange} />
      </div>

      {contacts.length === 0 ? (
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
                <SortHeader label="Name"    col="name"    {...sh} show={visible.has("name")} />
                <SortHeader label="Company" col="company" {...sh} show={visible.has("company")} />
                <SortHeader label="Title"   col="title"   {...sh} show={visible.has("title")} />
                <SortHeader label="Email"   col="email"   {...sh} show={visible.has("email")} />
                <SortHeader label="Phone"   col="phone"   {...sh} show={visible.has("phone")} />
              </tr>
            </thead>
            <tbody className="divide-y">
              {contacts.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-[var(--rx-surface)]">
                  {visible.has("name") && (
                    <td className="px-4 py-3">
                      <Link href={`/crm/contacts/${c.id}`} className="font-medium text-blue-600 hover:underline">
                        {c.firstName} {c.lastName}
                      </Link>
                    </td>
                  )}
                  {visible.has("company") && (
                    <td className="px-4 py-3">
                      {c.company ? (
                        <Link href={`/crm/companies/${c.company.id}`} className="text-muted-foreground hover:text-foreground">
                          {c.company.name}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  )}
                  {visible.has("title") && <td className="px-4 py-3 text-muted-foreground">{c.title ?? "—"}</td>}
                  {visible.has("email") && (
                    <td className="px-4 py-3">
                      <a href={`mailto:${c.email}`} className="text-muted-foreground hover:text-foreground">{c.email}</a>
                    </td>
                  )}
                  {visible.has("phone") && <td className="px-4 py-3 text-muted-foreground">{c.phone ?? "—"}</td>}
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
              <Link href={`?page=${page - 1}&search=${search}&sort=${sort}&dir=${dir}`} className="inline-flex items-center h-7 px-3 rounded-lg text-sm font-medium border border-border bg-background hover:bg-muted transition-all">Previous</Link>
            )}
            {page < pages && (
              <Link href={`?page=${page + 1}&search=${search}&sort=${sort}&dir=${dir}`} className="inline-flex items-center h-7 px-3 rounded-lg text-sm font-medium border border-border bg-background hover:bg-muted transition-all">Next</Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
