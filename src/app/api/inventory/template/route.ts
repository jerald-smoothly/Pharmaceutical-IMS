import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user || !["ADMIN", "STAFF"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const products = await prisma.product.findMany({
    where: { isActive: true },
    select: { sku: true, name: true },
    orderBy: { name: "asc" },
  });

  function csvCell(value: string) {
    const escaped = value.replace(/"/g, '""');
    return /[",\r\n]/.test(escaped) ? `"${escaped}"` : escaped;
  }

  const lines: string[] = [
    "sku,product_name,quantity,expiry_date",
    ...products.map((p) => `${csvCell(p.sku)},${csvCell(p.name)},,`),
  ];

  const csv = lines.join("\r\n") + "\r\n";

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="stock-import-template.csv"',
    },
  });
}
