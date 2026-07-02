import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { nextCompanyId } from "@/lib/ids";
import Papa from "papaparse";
import * as XLSX from "xlsx";

type Row = Record<string, string>;

function normalize(raw: Row[]): Row[] {
  return raw.map((r) =>
    Object.fromEntries(
      Object.entries(r).map(([k, v]) => [
        k.trim().toLowerCase().replace(/[\s-]+/g, "_"),
        String(v ?? "").trim(),
      ])
    )
  );
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || !["ADMIN", "STAFF"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  const ext = file.name.split(".").pop()?.toLowerCase();
  if (!["csv", "xlsx"].includes(ext ?? "")) {
    return NextResponse.json({ error: "Only CSV and XLSX are accepted." }, { status: 400 });
  }

  const buffer = await file.arrayBuffer();
  let rows: Row[] = [];

  try {
    if (ext === "csv") {
      const text = new TextDecoder().decode(buffer);
      const result = Papa.parse<Row>(text, { header: true, skipEmptyLines: true });
      rows = normalize(result.data);
    } else {
      const wb = XLSX.read(buffer, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      rows = normalize(
        XLSX.utils.sheet_to_json<Row>(ws, { defval: "" })
      );
    }
  } catch {
    return NextResponse.json({ error: "Failed to parse file" }, { status: 422 });
  }

  let importedRows = 0;
  let skippedRows = 0;
  let failedRows = 0;
  const errors: { row: number; message: string }[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2;

    const name = row.name ?? "";
    if (!name) {
      skippedRows++;
      continue;
    }

    try {
      const existing = await prisma.company.findFirst({
        where: { name: { equals: name, mode: "insensitive" }, isActive: true },
      });

      if (existing) {
        await prisma.company.update({
          where: { id: existing.id },
          data: {
            ...(row.industry && { industry: row.industry }),
            ...(row.email && { email: row.email }),
            ...(row.phone && { phone: row.phone }),
            ...(row.website && { website: row.website }),
            ...(row.address && { address: row.address }),
            ...(row.city && { city: row.city }),
            ...(row.state && { state: row.state }),
            ...(row.country && { country: row.country }),
            ...(row.postal_code && { postalCode: row.postal_code }),
            ...(row.tax_id && { taxId: row.tax_id }),
            ...(row.notes && { notes: row.notes }),
          },
        });
      } else {
        await prisma.company.create({
          data: {
            companyNumber: await nextCompanyId(),
            name,
            industry: row.industry || null,
            email: row.email || null,
            phone: row.phone || null,
            website: row.website || null,
            address: row.address || null,
            city: row.city || null,
            state: row.state || null,
            country: row.country || null,
            postalCode: row.postal_code || null,
            taxId: row.tax_id || null,
            notes: row.notes || null,
          },
        });
      }

      importedRows++;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      errors.push({ row: rowNum, message: `${name}: ${msg}` });
      failedRows++;
    }
  }

  return NextResponse.json({ importedRows, skippedRows, failedRows, errors });
}
