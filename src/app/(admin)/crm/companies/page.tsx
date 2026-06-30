import { prisma } from "@/lib/db";
import { Building2, Plus, Upload, Users, ShoppingCart, ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import Link from "next/link";
import CompanyFormDialog from "@/components/admin/CompanyFormDialog";
import ImportCrmDialog from "@/components/admin/ImportCrmDialog";
import SearchInput from "@/components/shared/SearchInput";

type Dir = "asc" | "desc";

function buildOrderBy(sort: string, dir: Dir) {
  switch (sort) {
    case "location": return [{ city: dir }];
    case "contacts": return [{ contacts: { _count: dir } }];
    case "orders":   return [{ orders: { _count: dir } }];
    default:         return [{ name: dir }];
  }
}

async function getCompanies(search: string, page: number, sort: string, dir: Dir) {
  const limit = 20;
  const where = search
    ? {
        isActive: true,
        OR: [
          { name: { contains: search, mode: "insensitive" as const } },
          { email: { contains: search, mode: "insensitive" as const } },
          { city: { contains: search, mode: "insensitive" as const } },
        ],
      }
    : { isActive: true };

  const [companies, total] = await Promise.all([
    prisma.company.findMany({
      where,
      include: { _count: { select: { contacts: true, orders: true } } },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      orderBy: buildOrderBy(sort, dir) as any,
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.company.count({ where }),
  ]);

  return { companies, total, pages: Math.ceil(total / limit) };
}

function SortHeader({
  label, col, sort, dir, search, page,
}: {
  label: string; col: string; sort: string; dir: Dir; search: string; page: number;
}) {
  const isActive = sort === col;
  const nextDir: Dir = isActive && dir === "asc" ? "desc" : "asc";
  const Icon = isActive ? (dir === "asc" ? ChevronUp : ChevronDown) : ChevronsUpDown;
  return (
    <th className="px-4 py-3 text-left">
      <Link
        href={`?sort=${col}&dir=${nextDir}&search=${encodeURIComponent(search)}&page=1`}
        className={`inline-flex items-center gap-1 text-sm font-medium select-none transition-colors ${
          isActive ? "text-gray-900" : "text-gray-600 hover:text-gray-900"
        }`}
      >
        {label}
        <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? "text-blue-600" : "text-gray-400"}`} />
      </Link>
    </th>
  );
}

interface Props {
  searchParams: Promise<{ search?: string; page?: string; sort?: string; dir?: string }>;
}

export default async function CompaniesPage({ searchParams }: Props) {
  const params = await searchParams;
  const search = params.search ?? "";
  const page = parseInt(params.page ?? "1");
  const sort = params.sort ?? "name";
  const dir: Dir = params.dir === "desc" ? "desc" : "asc";
  const { companies, total, pages } = await getCompanies(search, page, sort, dir);

  const shProps = { sort, dir, search, page };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Companies</h1>
          <p className="text-muted-foreground">{total} companies</p>
        </div>
        <div className="flex items-center gap-2">
          <ImportCrmDialog entity="companies">
            <button className="inline-flex items-center gap-2 h-8 px-3 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-all">
              <Upload className="w-4 h-4" />
              Import Companies
            </button>
          </ImportCrmDialog>
          <CompanyFormDialog>
            <button className="inline-flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/80 h-8 px-3 rounded-lg text-sm font-medium transition-all">
              <Plus className="w-4 h-4" />
              Add Company
            </button>
          </CompanyFormDialog>
        </div>
      </div>

      <SearchInput
        placeholder="Search by name, email, or city..."
        defaultValue={search}
        preserveParams={{ sort, dir }}
      />

      {companies.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Building2 className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p className="font-medium">No companies yet</p>
          <p className="text-sm mt-1">Add your first company to get started</p>
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <SortHeader label="Company"  col="name"     {...shProps} />
                <SortHeader label="Location" col="location" {...shProps} />
                <SortHeader label="Contacts" col="contacts" {...shProps} />
                <SortHeader label="Orders"   col="orders"   {...shProps} />
              </tr>
            </thead>
            <tbody className="divide-y">
              {companies.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link href={`/crm/companies/${c.id}`} className="font-medium text-blue-600 hover:underline">
                      {c.name}
                    </Link>
                    {c.email && <p className="text-xs text-muted-foreground">{c.email}</p>}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {[c.city, c.country].filter(Boolean).join(", ") || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 text-muted-foreground">
                      <Users className="w-3.5 h-3.5" />
                      {c._count.contacts}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 text-muted-foreground">
                      <ShoppingCart className="w-3.5 h-3.5" />
                      {c._count.orders}
                    </span>
                  </td>
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
