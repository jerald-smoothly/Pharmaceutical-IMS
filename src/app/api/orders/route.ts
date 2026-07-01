import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const createSchema = z.object({
  contactId: z.string().optional(),
  companyId: z.string().optional(),
  notes: z.string().optional(),
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        quantity: z.number().int().positive(),
      })
    )
    .min(1),
});

function generateOrderNumber() {
  const year = new Date().getFullYear();
  const rand = Math.floor(Math.random() * 90000) + 10000;
  return `ORD-${year}-${rand}`;
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? "";
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = 20;

  const isStaff = ["ADMIN", "STAFF"].includes(session.user.role);

  let contactId: string | undefined;
  if (!isStaff) {
    const contact = await prisma.contact.findFirst({ where: { userId: session.user.id } });
    if (!contact) return NextResponse.json({ orders: [], total: 0, page: 1, pages: 0 });
    contactId = contact.id;
  }

  const where = {
    ...(contactId ? { contactId } : {}),
    ...(status ? { status: status as never } : {}),
  };

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      include: {
        company: { select: { name: true } },
        contact: { select: { firstName: true, lastName: true } },
        items: { include: { product: { select: { name: true, sku: true } } } },
      },
      orderBy: { placedAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.order.count({ where }),
  ]);

  return NextResponse.json({ orders, total, page, pages: Math.ceil(total / limit) });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const isStaff = ["ADMIN", "STAFF"].includes(session.user.role as string);

  let resolvedContactId: string | undefined;
  let resolvedCompanyId: string | undefined;

  if (isStaff) {
    resolvedContactId = parsed.data.contactId;
    resolvedCompanyId = parsed.data.companyId;
  } else {
    const contact = await prisma.contact.findFirst({ where: { userId: session.user.id } });
    resolvedContactId = contact?.id;
    resolvedCompanyId = contact?.companyId ?? undefined;
  }

  const productIds = parsed.data.items.map((i) => i.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, isActive: true },
    include: {
      batches: {
        where: { expiryDate: { gt: new Date() } },
        select: { quantityIn: true, quantityOut: true, quantityOnHold: true },
      },
    },
  });

  const productMap = new Map(products.map((p) => [p.id, p]));
  const orderItems = [];
  let totalAmount = 0;

  for (const item of parsed.data.items) {
    const product = productMap.get(item.productId);
    if (!product) {
      return NextResponse.json({ error: `Product ${item.productId} not found` }, { status: 400 });
    }
    const stock = product.batches.reduce(
      (s, b) => s + b.quantityIn - b.quantityOut - b.quantityOnHold,
      0
    );
    if (stock < item.quantity) {
      return NextResponse.json(
        { error: `Insufficient stock for ${product.name}. Available: ${stock}` },
        { status: 400 }
      );
    }
    const unitPrice = Number(product.unitPrice);
    totalAmount += unitPrice * item.quantity;
    orderItems.push({ productId: item.productId, quantity: item.quantity, unitPrice });
  }

  const order = await prisma.order.create({
    data: {
      orderNumber: generateOrderNumber(),
      contactId: resolvedContactId,
      companyId: resolvedCompanyId,
      notes: parsed.data.notes,
      totalAmount,
      items: { create: orderItems },
    },
    include: {
      items: { include: { product: { select: { name: true } } } },
      contact: { select: { firstName: true, lastName: true } },
      company: { select: { name: true } },
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: "CREATE",
      entity: "Order",
      entityId: order.id,
      after: { orderNumber: order.orderNumber, totalAmount },
    },
  });

  return NextResponse.json(order, { status: 201 });
}
