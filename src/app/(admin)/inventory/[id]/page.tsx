import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { Package, Hash } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

export default async function InventoryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      batches: {
        orderBy: { expiryDate: "asc" },
        select: { id: true, batchNumber: true, expiryDate: true, quantityIn: true, quantityOut: true, quantityOnHold: true },
      },
    },
  });

  if (!product) notFound();

  const totalStock = product.batches.reduce(
    (sum, b) => sum + b.quantityIn - b.quantityOut - (b.quantityOnHold ?? 0),
    0
  );

  return (
    <div className="p-8 space-y-6 max-w-3xl">
      <div className="flex items-start justify-between">
        <div>
          <Link href="/inventory" className="text-sm text-muted-foreground hover:text-foreground">
            ← Inventory
          </Link>
          {product.productNumber && (
            <div className="flex items-center gap-2 mt-1">
              <Hash className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Inventory ID:</span>
              <span className="font-mono text-sm bg-gray-100 dark:bg-muted px-1.5 py-0.5 rounded text-gray-900 dark:text-foreground">
                {product.productNumber}
              </span>
            </div>
          )}
          <h1 className="text-2xl font-bold mt-0.5">{product.name}</h1>
        </div>
        <div className="flex items-center gap-2 mt-6">
          {product.requiresPrescription ? (
            <Badge variant="outline" className="text-blue-600 border-blue-300">Rx</Badge>
          ) : (
            <span className="text-sm text-muted-foreground">OTC</span>
          )}
        </div>
      </div>

      {/* Stock stat */}
      <div className="grid grid-cols-1 gap-4">
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center shrink-0">
                <Package className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className={`text-2xl font-bold ${totalStock === 0 ? "text-red-600" : totalStock < 10 ? "text-amber-600" : ""}`}>
                  {totalStock}
                </p>
                <p className="text-xs text-muted-foreground">Units in Stock</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Product details */}
      <Card>
        <CardHeader><CardTitle className="text-base">Product Details</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">SKU</span>
            <span className="font-mono text-xs">{product.sku}</span>
          </div>
          {product.category && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Category</span>
              <span>{product.category}</span>
            </div>
          )}
          {product.manufacturer && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Manufacturer</span>
              <span>{product.manufacturer}</span>
            </div>
          )}
          {product.unit && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Unit</span>
              <span>{product.unit}</span>
            </div>
          )}
          {product.expiryDate && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Expiry Date</span>
              <span>
                {new Date(product.expiryDate).toLocaleDateString("en-US", {
                  month: "2-digit", day: "2-digit", year: "numeric", timeZone: "UTC",
                })}
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
