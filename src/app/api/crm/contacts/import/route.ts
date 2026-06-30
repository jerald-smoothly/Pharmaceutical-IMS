import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
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

    const email = (row.email ?? "").toLowerCase();
    if (!email) {
      skippedRows++;
      continue;
    }

    const firstName = row.first_name ?? "";
    const lastName = row.last_name ?? "";

    try {
      let companyId: string | null = null;
      const companyName = row.company_name ?? row.company ?? "";
      if (companyName) {
        const company = await prisma.company.findFirst({
          where: { name: { equals: companyName, mode: "insensitive" }, isActive: true },
        });
        companyId = company?.id ?? null;
      }

      const existing = await prisma.contact.findUnique({ where: { email } });

      if (existing) {
        await prisma.contact.update({
          where: { email },
          data: {
            ...(firstName && { firstName }),
            ...(lastName && { lastName }),
            ...(row.phone && { phone: row.phone }),
            ...(row.title && { title: row.title }),
            ...(row.department && { department: row.department }),
            ...(row.notes && { notes: row.notes }),
            ...(companyId && { companyId }),
          },
        });
      } else {
        if (!firstName || !lastName) {
          errors.push({ row: rowNum, message: `${email}: first_name and last_name are required for new contacts` });
          failedRows++;
          continue;
        }
        await prisma.contact.create({
          data: {
            firstName,
            lastName,
            email,
            phone: row.phone || null,
            title: row.title || null,
            department: row.department || null,
            notes: row.notes || null,
            companyId,
          },
        });
      }

      importedRows++;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      errors.push({ row: rowNum, message: `${email}: ${msg}` });
      failedRows++;
    }
  }

  return NextResponse.json({ importedRows, skippedRows, failedRows, errors });
}
