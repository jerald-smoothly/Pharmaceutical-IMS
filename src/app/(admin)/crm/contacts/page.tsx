import { prisma } from "@/lib/db";
import { Plus, Upload } from "lucide-react";
import ContactFormDialog from "@/components/admin/ContactFormDialog";
import ImportCrmDialog from "@/components/admin/ImportCrmDialog";
import ContactsTable from "@/components/admin/ContactsTable";

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
    case "title":   return [{ title: dir }];
    case "email":   return [{ email: dir }];
    case "phone":   return [{ phone: dir }];
    default:        return [{ firstName: dir }, { lastName: dir }];
  }
}

async function getContacts(search: string, page: number, sort: string, dir: Dir) {
  const limit = 20;
  await syncEmployeeContacts();

  const words = search.trim().split(/\s+/).filter(Boolean);
  const searchFilter = words.length
    ? {
        AND: words.map((word) => ({
          OR: [
            { firstName: { contains: word, mode: "insensitive" as const } },
            { lastName: { contains: word, mode: "insensitive" as const } },
            { email: { contains: word, mode: "insensitive" as const } },
          ],
        })),
      }
    : null;

  const where = {
    AND: [
      { OR: [{ isActive: true }, { user: { status: "ACTIVE" } }] },
      ...(searchFilter ? [searchFilter] : []),
    ],
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [contacts, total] = await Promise.all([
    prisma.contact.findMany({
      where: where as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      orderBy: buildOrderBy(sort, dir) as any,
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.contact.count({ where: where as any }),
  ]);

  return { contacts, total, pages: Math.ceil(total / limit) };
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
  const { contacts, total, pages } = await getContacts(search, page, sort, dir);

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-foreground">Contacts</h1>
          <p className="text-muted-foreground">{total} contacts</p>
        </div>
        <div className="flex items-center gap-2">
          <ImportCrmDialog entity="contacts">
            <button className="inline-flex items-center gap-2 h-8 px-3 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-all">
              <Upload className="w-4 h-4" />
              Import Contacts
            </button>
          </ImportCrmDialog>
          <ContactFormDialog>
            <button className="inline-flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/80 h-8 px-3 rounded-lg text-sm font-medium transition-all">
              <Plus className="w-4 h-4" />
              Add Contact
            </button>
          </ContactFormDialog>
        </div>
      </div>

      <ContactsTable contacts={contacts} search={search} sort={sort} dir={dir} page={page} pages={pages} />
    </div>
  );
}
