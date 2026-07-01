"use client";

import Link from "next/link";
import { Building2, Users, ShoppingCart, ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import SearchInput from "@/components/shared/SearchInput";
import { ColumnPicker, useColumnPicker, ColDef } from "@/components/shared/ColumnPicker";

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
  const sh = { sort, dir, search };

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
                <SortHeader label="Company"  col="name"     {...sh} show={visible.has("company")} />
                <SortHeader label="Location" col="location" {...sh} show={visible.has("location")} />
                <SortHeader label="Contacts" col="contacts" {...sh} show={visible.has("contacts")} />
                <SortHeader label="Orders"   col="orders"   {...sh} show={visible.has("orders")} />
              </tr>
            </thead>
            <tbody className="divide-y">
              {companies.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-[var(--rx-surface)]">
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
