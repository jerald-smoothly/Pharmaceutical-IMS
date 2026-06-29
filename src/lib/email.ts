import nodemailer from "nodemailer";

function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT ?? 587),
    secure: process.env.EMAIL_SECURE === "true",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
}

export async function sendOtpEmail(to: string, otp: string, name: string) {
  if (!process.env.EMAIL_HOST) {
    console.log(`[DEV] OTP for ${to}: ${otp}`);
    return;
  }

  const from = process.env.EMAIL_FROM ?? `RxPharmas <noreply@rxpharmas.com>`;
  const transporter = createTransporter();

  await transporter.sendMail({
    from,
    to,
    subject: "Your RxPharmas verification code",
    html: `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f9fafb;font-family:system-ui,sans-serif;">
  <div style="max-width:480px;margin:40px auto;background:white;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden;">
    <div style="background:#2563eb;padding:24px 32px;">
      <p style="margin:0;color:white;font-size:20px;font-weight:600;">RxPharmas</p>
    </div>
    <div style="padding:32px;">
      <p style="margin:0 0 8px;font-size:16px;color:#111827;">Hi ${name},</p>
      <p style="margin:0 0 24px;font-size:14px;color:#6b7280;">
        Use the verification code below to complete your registration. This code expires in <strong>10 minutes</strong>.
      </p>
      <div style="background:#f3f4f6;border-radius:8px;padding:20px;text-align:center;margin-bottom:24px;">
        <p style="margin:0;font-size:36px;font-weight:700;letter-spacing:12px;color:#111827;">${otp}</p>
      </div>
      <p style="margin:0;font-size:12px;color:#9ca3af;">
        If you didn't request this, you can safely ignore this email.
      </p>
    </div>
  </div>
</body>
</html>`,
  });
}
