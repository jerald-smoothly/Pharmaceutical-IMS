import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const updateSchema = z.object({
  status: z.enum(["CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"]).optional(),
  contactId: z.string().nullable().optional(),
  companyId: z.string().nullable().optional(),
});

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      company: true,
      contact: true,
      items: { include: { product: true } },
    },
  });

  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(order);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || !["ADMIN", "STAFF"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { status, contactId, companyId } = parsed.data;
  const data: Record<string, unknown> = {};
  if (status !== undefined) {
    data.status = status;
    if (status === "DELIVERED") data.fulfilledAt = new Date();
  }
  if (contactId !== undefined) data.contactId = contactId;
  if (companyId !== undefined) data.companyId = companyId;

  const order = await prisma.order.update({
    where: { id },
    data,
    include: {
      company: { select: { name: true } },
      contact: { select: { firstName: true, lastName: true, email: true } },
      items: { include: { product: { select: { name: true } } } },
    },
  });

  if (status !== undefined) {
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "STATUS_UPDATE",
        entity: "Order",
        entityId: id,
        after: { status },
      },
    });
  }

  return NextResponse.json(order);
}
