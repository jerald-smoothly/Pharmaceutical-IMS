import Link from "next/link";
import { prisma } from "@/lib/db";
import { Upload, Package, Plus } from "lucide-react";
import ProductFormDialog from "@/components/admin/ProductFormDialog";
import CopyEmbedButton from "@/components/admin/CopyEmbedButton";
import InventoryTable from "@/components/admin/InventoryTable";

async function getProducts(search: string, page: number, expiry: string) {
  const limit = 25;
  const now = new Date();

  const searchWhere = search
    ? {
        OR: [
          { name: { contains: search, mode: "insensitive" as const } },
          { sku: { contains: search, mode: "insensitive" as const } },
        ],
      }
    : {};

  let expiryWhere = {};
  if (expiry === "expired") {
    expiryWhere = { batches: { some: { expiryDate: { lt: now } } } };
  } else if (expiry) {
    const daysOut = parseInt(expiry, 10);
    const cutoff = new Date(now.getTime() + daysOut * 86400000);
    expiryWhere = { batches: { some: { expiryDate: { gte: now, lte: cutoff } } } };
  }

  const where = { isActive: true, ...searchWhere, ...expiryWhere };

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: {
        batches: {
          select: { quantityIn: true, quantityOut: true, quantityOnHold: true, expiryDate: true },
          orderBy: { expiryDate: "asc" },
        },
      },
      orderBy: { name: "asc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.product.count({ where }),
  ]);

  return {
    products: products.map((p) => {
      const nonExpired = p.batches.filter((b) => b.expiryDate > now);
      return {
        id: p.id,
        sku: p.sku,
        name: p.name,
        category: p.category,
        unit: p.unit,
        expiryDate: p.expiryDate?.toISOString() ?? null,
        requiresPrescription: p.requiresPrescription,
        stock: nonExpired.reduce((s, b) => s + b.quantityIn - b.quantityOut - b.quantityOnHold, 0),
        earliestExpiry: p.batches[0]?.expiryDate?.toISOString() ?? null,
      };
    }),
    total,
    pages: Math.ceil(total / limit),
  };
}

interface Props {
  searchParams: Promise<{ search?: string; page?: string; expiry?: string }>;
}

export default async function InventoryPage({ searchParams }: Props) {
  const params = await searchParams;
  const search = params.search ?? "";
  const page = parseInt(params.page ?? "1");
  const expiry = params.expiry ?? "";
  const { products, total, pages } = await getProducts(search, page, expiry);

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-foreground">Inventory</h1>
          <p className="text-muted-foreground">{total} products</p>
        </div>
        <div className="flex items-center gap-2">
          <CopyEmbedButton />
          <Link
            href="/inventory/import"
            className="inline-flex items-center gap-2 h-8 px-2.5 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-all"
          >
            <Upload className="w-4 h-4" />
            Import Stock
          </Link>
          <ProductFormDialog>
            <button className="inline-flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/80 h-8 px-2.5 rounded-lg text-sm font-medium transition-all">
              <Plus className="w-4 h-4" />
              New Product
            </button>
          </ProductFormDialog>
        </div>
      </div>

<InventoryTable products={products} search={search} expiry={expiry} page={page} pages={pages} />
    </div>
  );
}
