import { prisma } from "@/lib/db";
import { Package } from "lucide-react";
import Link from "next/link";
import AddToCartButton from "@/components/portal/AddToCartButton";

async function getProducts(search: string, page: number) {
  const limit = 24;
  const now = new Date();
  const where = {
    isActive: true,
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { genericName: { contains: search, mode: "insensitive" as const } },
            { category: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: {
        batches: {
          where: { expiryDate: { gt: now } },
          select: { quantityIn: true, quantityOut: true, quantityOnHold: true },
        },
      },
      orderBy: { name: "asc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.product.count({ where }),
  ]);

  return {
    products: products.map((p) => ({
      ...p,
      stock: p.batches.reduce((s, b) => s + b.quantityIn - b.quantityOut - b.quantityOnHold, 0),
    })),
    total,
    pages: Math.ceil(total / limit),
  };
}

interface Props {
  searchParams: Promise<{ search?: string; page?: string }>;
}

export default async function CatalogPage({ searchParams }: Props) {
  const params = await searchParams;
  const search = params.search ?? "";
  const page = parseInt(params.page ?? "1");
  const { products, total, pages } = await getProducts(search, page);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Product Catalog</h1>
        <p className="text-muted-foreground">{total} products available</p>
      </div>

      <form className="flex gap-3">
        <input
          name="search"
          defaultValue={search}
          placeholder="Search products, generic names, categories..."
          className="flex-1 border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button type="submit" className="inline-flex items-center h-9 px-4 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-all">
          Search
        </button>
      </form>

      {products.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Package className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p className="font-medium">No products found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {products.map((p) => (
            <div key={p.id} className="bg-white rounded-xl border p-4 flex flex-col gap-3 hover:shadow-sm transition-shadow">
              <div className="flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-sm leading-tight">{p.name}</p>
                    {p.genericName && (
                      <p className="text-xs text-muted-foreground mt-0.5">{p.genericName}</p>
                    )}
                  </div>
                  {p.requiresPrescription && (
                    <span className="shrink-0 text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-medium">Rx</span>
                  )}
                </div>
                {p.category && (
                  <span className="inline-block mt-2 text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{p.category}</span>
                )}
              </div>

              <div className="border-t pt-3">
                <div className="flex items-end justify-between mb-3">
                  <div>
                    <p className="text-lg font-bold text-gray-900">${Number(p.unitPrice).toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">per {p.unit}</p>
                  </div>
                  <span className={`text-xs font-medium ${p.stock === 0 ? "text-red-600" : p.stock < 10 ? "text-amber-600" : "text-green-600"}`}>
                    {p.stock === 0 ? "Out of stock" : `${p.stock} in stock`}
                  </span>
                </div>
                <AddToCartButton product={{ id: p.id, name: p.name, unitPrice: Number(p.unitPrice), unit: p.unit, stock: p.stock }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {pages > 1 && (
        <div className="flex items-center justify-center gap-2 text-sm pt-4">
          {page > 1 && (
            <Link href={`?page=${page - 1}&search=${search}`} className="inline-flex items-center h-8 px-4 rounded-lg border border-border bg-white hover:bg-muted transition-all">Previous</Link>
          )}
          <span className="text-muted-foreground">Page {page} of {pages}</span>
          {page < pages && (
            <Link href={`?page=${page + 1}&search=${search}`} className="inline-flex items-center h-8 px-4 rounded-lg border border-border bg-white hover:bg-muted transition-all">Next</Link>
          )}
        </div>
      )}
    </div>
  );
}
