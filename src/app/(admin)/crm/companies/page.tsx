import { prisma } from "@/lib/db";
import { Building2, Plus, Upload } from "lucide-react";
import CompanyFormDialog from "@/components/admin/CompanyFormDialog";
import ImportCrmDialog from "@/components/admin/ImportCrmDialog";
import CompaniesTable from "@/components/admin/CompaniesTable";

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

  return {
    companies: companies.map((c) => ({
      id: c.id,
      name: c.name,
      email: c.email,
      city: c.city,
      state: c.state,
      contactCount: c._count.contacts,
      orderCount: c._count.orders,
    })),
    total,
    pages: Math.ceil(total / limit),
  };
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

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-foreground">Companies</h1>
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

      <CompaniesTable companies={companies} search={search} sort={sort} dir={dir} page={page} pages={pages} />
    </div>
  );
}
