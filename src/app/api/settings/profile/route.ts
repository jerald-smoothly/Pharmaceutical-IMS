import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, email: true, contact: { select: { firstName: true, lastName: true, phone: true } } },
  });
  if (!user) return Response.json({ error: "Not found" }, { status: 404 });

  const parts = (user.name ?? "").split(" ");
  return Response.json({
    firstName: user.contact?.firstName ?? parts[0] ?? "",
    lastName: user.contact?.lastName ?? parts.slice(1).join(" ") ?? "",
    email: user.email,
    phone: user.contact?.phone ?? "",
  });
}

const schema = z.object({
  firstName: z.string().min(1).regex(/^[A-Za-z]+$/, "First Name must be letters only"),
  lastName: z.string().min(1).regex(/^[A-Za-z][A-Za-z\s-]*$/, "Last Name may only contain letters, spaces, or hyphens"),
  email: z.string().email("Please enter a valid email address"),
  phone: z.string().min(7, "Please enter a valid phone number"),
});

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { firstName, lastName, email, phone } = parsed.data;
  const fullName = `${firstName} ${lastName}`;

  const emailConflict = await prisma.user.findFirst({
    where: { email, NOT: { id: session.user.id } },
  });
  if (emailConflict) return Response.json({ error: "Email is already in use by another account." }, { status: 409 });

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: session.user.id },
      data: { name: fullName, email },
    });

    const contact = await tx.contact.findUnique({ where: { userId: session.user.id } });
    if (contact) {
      await tx.contact.update({
        where: { userId: session.user.id },
        data: { firstName, lastName, email, phone },
      });
    } else {
      await tx.contact.create({
        data: { userId: session.user.id, firstName, lastName, email, phone },
      });
    }
  });

  return Response.json({ ok: true });
}
