import { prisma } from "@/lib/db";
import { Users, Plus, Upload } from "lucide-react";
import Link from "next/link";
import ContactFormDialog from "@/components/admin/ContactFormDialog";
import ImportCrmDialog from "@/components/admin/ImportCrmDialog";

async function getContacts(search: string, page: number) {
  const limit = 20;
  const where = {
    isActive: true,
    ...(search
      ? {
          OR: [
            { firstName: { contains: search, mode: "insensitive" as const } },
            { lastName: { contains: search, mode: "insensitive" as const } },
            { email: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [contacts, total, companies] = await Promise.all([
    prisma.contact.findMany({
      where,
      include: { company: { select: { id: true, name: true } } },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.contact.count({ where }),
    prisma.company.findMany({ where: { isActive: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  return { contacts, total, pages: Math.ceil(total / limit), companies };
}

interface Props {
  searchParams: Promise<{ search?: string; page?: string }>;
}

export default async function ContactsPage({ searchParams }: Props) {
  const params = await searchParams;
  const search = params.search ?? "";
  const page = parseInt(params.page ?? "1");
  const { contacts, total, pages, companies } = await getContacts(search, page);

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
                <th className="px-4 py-3 text-left font-medium text-gray-600">Name</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Company</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Title</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Email</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Phone</th>
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
              <Link href={`?page=${page - 1}&search=${search}`} className="inline-flex items-center h-7 px-3 rounded-lg text-sm font-medium border border-border bg-background hover:bg-muted transition-all">Previous</Link>
            )}
            {page < pages && (
              <Link href={`?page=${page + 1}&search=${search}`} className="inline-flex items-center h-7 px-3 rounded-lg text-sm font-medium border border-border bg-background hover:bg-muted transition-all">Next</Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
