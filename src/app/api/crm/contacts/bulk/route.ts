import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const schema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("delete"),
    ids: z.array(z.string()).min(1),
  }),
  z.object({
    action: z.literal("update"),
    ids: z.array(z.string()).min(1),
    data: z.object({
      companyId: z.string().nullable().optional(),
      title: z.string().nullable().optional(),
    }),
  }),
]);

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || !["ADMIN", "STAFF"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { action, ids } = parsed.data;

  if (action === "delete") {
    await prisma.contact.updateMany({ where: { id: { in: ids } }, data: { isActive: false } });
    await prisma.auditLog.create({
      data: { userId: session.user.id, action: "BULK_DELETE", entity: "Contact", entityId: ids.join(","), after: { ids } },
    });
    return NextResponse.json({ deleted: ids.length });
  }

  const updateData = parsed.data.data;
  await prisma.contact.updateMany({ where: { id: { in: ids } }, data: updateData });
  await prisma.auditLog.create({
    data: { userId: session.user.id, action: "BULK_UPDATE", entity: "Contact", entityId: ids.join(","), after: updateData },
  });
  return NextResponse.json({ updated: ids.length });
}
