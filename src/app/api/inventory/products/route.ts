import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") ?? "1");
  const search = searchParams.get("search") ?? "";
  const category = searchParams.get("category") ?? "";
  const limit = 20;

  const where = {
    isActive: true,
    AND: [
      search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" as const } },
              { sku: { contains: search, mode: "insensitive" as const } },
              { genericName: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {},
      category ? { category } : {},
    ],
  };

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: {
        batches: {
          where: { expiryDate: { gt: new Date() } },
          select: { quantityIn: true, quantityOut: true, quantityOnHold: true, expiryDate: true },
        },
      },
      orderBy: { name: "asc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.product.count({ where }),
  ]);

  const productsWithStock = products.map((p) => ({
    ...p,
    stockAvailable: p.batches.reduce(
      (sum, b) => sum + b.quantityIn - b.quantityOut - b.quantityOnHold,
      0
    ),
    nearestExpiry: p.batches.reduce<Date | null>(
      (min, b) => (!min || b.expiryDate < min ? b.expiryDate : min),
      null
    ),
  }));

  return NextResponse.json({
    products: productsWithStock,
    total,
    page,
    pages: Math.ceil(total / limit),
  });
}
