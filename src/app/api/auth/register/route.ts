import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { sendOtpEmail } from "@/lib/email";
import { z } from "zod";

const schema = z.object({
  firstName: z.string().min(2).regex(/^[A-Za-z]+$/, "First name must be one word, letters only"),
  lastName: z.string().min(1).regex(/^[A-Za-z][A-Za-z\s-]*$/, "Last name must contain letters, spaces, or hyphens"),
  email: z.string().email("Please enter a valid email address"),
  phone: z.string().min(7, "Please enter a valid phone number"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return Response.json({ error: first.message }, { status: 400 });
  }

  const { firstName, lastName, email, phone, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return Response.json({ error: "An account with this email already exists." }, { status: 409 });
  }

  const otp = generateOtp();
  const expires = new Date(Date.now() + 10 * 60 * 1000);

  // Store OTP with pending registration data as JSON in the token field's companion
  // Use identifier = email, token = otp, and store form data alongside
  await prisma.verificationToken.deleteMany({ where: { identifier: email } });
  await prisma.verificationToken.create({
    data: {
      identifier: email,
      token: otp,
      expires,
    },
  });

  // Store pending registration data in a second token entry keyed with prefix
  await prisma.verificationToken.create({
    data: {
      identifier: `pending:${email}`,
      token: JSON.stringify({ firstName, lastName, email, phone, password }),
      expires,
    },
  });

  await sendOtpEmail(email, otp, firstName);

  return Response.json({ ok: true });
}
