import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { nextProductId } from "@/lib/ids";
import { z } from "zod";

const createSchema = z.object({
  sku: z.string().min(1, "SKU is required"),
  name: z.string().min(2, "Product name must be at least 2 characters"),
  genericName: z.string().optional(),
  manufacturer: z.string().optional(),
  category: z.string().optional(),
  description: z.string().optional(),
  unit: z.string().default("box"),
  unitPrice: z.coerce.number().nonnegative().default(0),
  expiryDate: z.string().regex(/^\d{2}\/\d{2}\/\d{4}$/).optional().transform((val) => {
    if (!val) return undefined;
    const [m, d, y] = val.split("/").map(Number);
    return new Date(Date.UTC(y, m - 1, d));
  }),
  requiresPrescription: z.boolean().default(false),
  initialStock: z.coerce.number().int().nonnegative().optional(),
});

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

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || !["ADMIN", "STAFF"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const { sku, initialStock, ...rest } = parsed.data;
  const normalizedSku = sku.trim().toUpperCase();

  const existing = await prisma.product.findUnique({ where: { sku: normalizedSku } });
  if (existing) {
    return NextResponse.json({ error: `A product with SKU "${normalizedSku}" already exists` }, { status: 409 });
  }

  const product = await prisma.product.create({
    data: { productNumber: await nextProductId(), sku: normalizedSku, ...rest },
  });

  if (initialStock && initialStock > 0) {
    await prisma.productBatch.create({
      data: {
        productId: product.id,
        batchNumber: `INIT-${Date.now()}`,
        expiryDate: new Date(Date.UTC(2099, 11, 31)),
        quantityIn: initialStock,
      },
    });
  }

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: "CREATE",
      entity: "Product",
      entityId: product.id,
      after: { sku: normalizedSku, ...rest, initialStock },
    },
  });

  return NextResponse.json(product, { status: 201 });
}
