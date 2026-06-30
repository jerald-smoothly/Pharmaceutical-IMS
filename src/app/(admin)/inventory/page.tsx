import Link from "next/link";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, Package } from "lucide-react";

async function getProducts(search: string, page: number) {
  const limit = 25;
  const where = search
    ? {
        isActive: true,
        OR: [
          { name: { contains: search, mode: "insensitive" as const } },
          { sku: { contains: search, mode: "insensitive" as const } },
          { genericName: { contains: search, mode: "insensitive" as const } },
        ],
      }
    : { isActive: true };

  const now = new Date();
  const [products, total, totalActive] = await Promise.all([
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
    prisma.product.count({ where: { isActive: true } }),
  ]);

  return {
    products: products.map((p) => ({
      ...p,
      stock: p.batches.reduce((s, b) => s + b.quantityIn - b.quantityOut - b.quantityOnHold, 0),
    })),
    total,
    totalActive,
    pages: Math.ceil(total / limit),
  };
}

interface Props {
  searchParams: Promise<{ search?: string; page?: string }>;
}

export default async function InventoryPage({ searchParams }: Props) {
  const params = await searchParams;
  const search = params.search ?? "";
  const page = parseInt(params.page ?? "1");
  const { products, total, pages, totalActive } = await getProducts(search, page);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory</h1>
          <p className="text-muted-foreground">{total} products</p>
        </div>
        <Link
          href="/inventory/import"
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/80 h-8 px-2.5 rounded-lg text-sm font-medium transition-all"
        >
          <Upload className="w-4 h-4" />
          Import Stock
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Products</p>
                <p className="text-3xl font-bold mt-1">{totalActive}</p>
              </div>
              <Package className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <form className="flex gap-3">
        <input
          name="search"
          defaultValue={search}
          placeholder="Search by name, SKU, or generic name..."
          className="flex-1 border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <Button type="submit" variant="outline">Search</Button>
      </form>

      {products.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Package className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p className="font-medium">No products found</p>
          <p className="text-sm mt-1">Import stock to get started</p>
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">SKU</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Name</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Category</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Unit Price</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Stock</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Rx</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {products.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{p.sku}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{p.name}</p>
                    {p.genericName && (
                      <p className="text-xs text-muted-foreground">{p.genericName}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{p.category ?? "—"}</td>
                  <td className="px-4 py-3">${Number(p.unitPrice).toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`font-medium ${
                        p.stock === 0
                          ? "text-red-600"
                          : p.stock < 10
                          ? "text-amber-600"
                          : "text-green-700"
                      }`}
                    >
                      {p.stock} {p.unit}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {p.requiresPrescription ? (
                      <Badge variant="outline" className="text-blue-600 border-blue-300 text-xs">Rx</Badge>
                    ) : (
                      <span className="text-muted-foreground text-xs">OTC</span>
                    )}
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
              <Link
                href={`?page=${page - 1}&search=${search}`}
                className="inline-flex items-center h-7 px-2.5 rounded-lg text-sm font-medium border border-border bg-background hover:bg-muted transition-all"
              >
                Previous
              </Link>
            )}
            {page < pages && (
              <Link
                href={`?page=${page + 1}&search=${search}`}
                className="inline-flex items-center h-7 px-2.5 rounded-lg text-sm font-medium border border-border bg-background hover:bg-muted transition-all"
              >
                Next
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
