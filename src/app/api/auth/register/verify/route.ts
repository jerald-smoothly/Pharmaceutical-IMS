import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import { z } from "zod";

const schema = z.object({
  email: z.string().email(),
  otp: z.string().length(6),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }

  const { email, otp } = parsed.data;

  const [otpRecord, pendingRecord] = await Promise.all([
    prisma.verificationToken.findFirst({ where: { identifier: email } }),
    prisma.verificationToken.findFirst({ where: { identifier: `pending:${email}` } }),
  ]);

  if (!otpRecord || !pendingRecord) {
    return Response.json({ error: "Verification session expired. Please register again." }, { status: 400 });
  }

  if (new Date() > otpRecord.expires) {
    await prisma.verificationToken.deleteMany({
      where: { identifier: { in: [email, `pending:${email}`] } },
    });
    return Response.json({ error: "Code expired. Please register again." }, { status: 400 });
  }

  if (otpRecord.token !== otp) {
    return Response.json({ error: "Incorrect code. Please try again." }, { status: 400 });
  }

  const data = JSON.parse(pendingRecord.token) as {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    password: string;
  };

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    await prisma.verificationToken.deleteMany({
      where: { identifier: { in: [email, `pending:${email}`] } },
    });
    return Response.json({ error: "An account with this email already exists." }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(data.password, 12);

  await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        name: `${data.firstName} ${data.lastName}`,
        email: data.email,
        passwordHash,
        role: "CUSTOMER",
        status: "PENDING",
      },
    });

    await tx.contact.create({
      data: {
        userId: user.id,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
      },
    });

    await tx.verificationToken.deleteMany({
      where: { identifier: { in: [email, `pending:${email}`] } },
    });
  });

  return Response.json({ ok: true });
}
