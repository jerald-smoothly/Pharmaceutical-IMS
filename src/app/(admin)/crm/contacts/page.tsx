import { prisma } from "@/lib/db";
import { Users, Plus, Upload, ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import Link from "next/link";
import ContactFormDialog from "@/components/admin/ContactFormDialog";
import ImportCrmDialog from "@/components/admin/ImportCrmDialog";

type Dir = "asc" | "desc";

async function syncEmployeeContacts() {
  const usersWithoutContacts = await prisma.user.findMany({
    where: { status: "ACTIVE", contact: null },
    select: { id: true, name: true, email: true },
  });
  if (usersWithoutContacts.length === 0) return;

  await Promise.allSettled(
    usersWithoutContacts.map(async (u) => {
      const parts = (u.name ?? "").trim().split(/\s+/);
      const firstName = parts[0] || "Staff";
      const lastName = parts.slice(1).join(" ") || "";
      const existing = await prisma.contact.findUnique({ where: { email: u.email } });
      if (existing && !existing.userId) {
        return prisma.contact.update({ where: { id: existing.id }, data: { userId: u.id } });
      }
      if (!existing) {
        return prisma.contact.create({ data: { userId: u.id, firstName, lastName, email: u.email } });
      }
    })
  );
}

function buildOrderBy(sort: string, dir: Dir) {
  switch (sort) {
    case "company": return [{ company: { name: dir } }];
    case "title":   return [{ title: dir }];
    case "email":   return [{ email: dir }];
    case "phone":   return [{ phone: dir }];
    default:        return [{ firstName: dir }, { lastName: dir }];
  }
}

async function getContacts(search: string, page: number, sort: string, dir: Dir) {
  const limit = 20;
  await syncEmployeeContacts();

  const searchFilter = search
    ? {
        OR: [
          { firstName: { contains: search, mode: "insensitive" as const } },
          { lastName: { contains: search, mode: "insensitive" as const } },
          { email: { contains: search, mode: "insensitive" as const } },
        ],
      }
    : null;

  const where = {
    AND: [
      { OR: [{ isActive: true }, { user: { status: "ACTIVE" } }] },
      ...(searchFilter ? [searchFilter] : []),
    ],
  };

  const [contacts, total, companies] = await Promise.all([
    prisma.contact.findMany({
      where,
      include: { company: { select: { id: true, name: true } } },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      orderBy: buildOrderBy(sort, dir) as any,
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.contact.count({ where }),
    prisma.company.findMany({ where: { isActive: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  return { contacts, total, pages: Math.ceil(total / limit), companies };
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

export default async function ContactsPage({ searchParams }: Props) {
  const params = await searchParams;
  const search = params.search ?? "";
  const page = parseInt(params.page ?? "1");
  const sort = params.sort ?? "name";
  const dir: Dir = params.dir === "desc" ? "desc" : "asc";
  const { contacts, total, pages, companies } = await getContacts(search, page, sort, dir);

  const shProps = { sort, dir, search, page };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contacts</h1>
          <p className="text-muted-foreground">{total} contacts</p>
        </div>
        <div className="flex items-center gap-2">
          <ImportCrmDialog entity="contacts">
            <button className="inline-flex items-center gap-2 h-8 px-3 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-all">
              <Upload className="w-4 h-4" />
              Import Contacts
            </button>
          </ImportCrmDialog>
          <ContactFormDialog companies={companies}>
            <button className="inline-flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/80 h-8 px-3 rounded-lg text-sm font-medium transition-all">
              <Plus className="w-4 h-4" />
              Add Contact
            </button>
          </ContactFormDialog>
        </div>
      </div>

      <form className="flex gap-3">
        <input
          name="search"
          defaultValue={search}
          placeholder="Search by name or email..."
          className="flex-1 border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button type="submit" className="inline-flex items-center h-9 px-4 rounded-lg text-sm font-medium border border-border bg-background hover:bg-muted transition-all">
          Search
        </button>
      </form>

      {contacts.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Users className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p className="font-medium">No contacts yet</p>
          <p className="text-sm mt-1">Add your first contact to get started</p>
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <SortHeader label="Name"    col="name"    {...shProps} />
                <SortHeader label="Company" col="company" {...shProps} />
                <SortHeader label="Title"   col="title"   {...shProps} />
                <SortHeader label="Email"   col="email"   {...shProps} />
                <SortHeader label="Phone"   col="phone"   {...shProps} />
              </tr>
            </thead>
            <tbody className="divide-y">
              {contacts.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link href={`/crm/contacts/${c.id}`} className="font-medium text-blue-600 hover:underline">
                      {c.firstName} {c.lastName}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    {c.company ? (
                      <Link href={`/crm/companies/${c.company.id}`} className="text-muted-foreground hover:text-foreground">
                        {c.company.name}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{c.title ?? "—"}</td>
                  <td className="px-4 py-3">
                    <a href={`mailto:${c.email}`} className="text-muted-foreground hover:text-foreground">{c.email}</a>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{c.phone ?? "—"}</td>
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
