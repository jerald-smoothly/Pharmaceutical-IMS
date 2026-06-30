import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { processImport, type ImportRow } from "@/lib/inventory-import";
import Papa from "papaparse";
import * as XLSX from "xlsx";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || !["ADMIN", "STAFF"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const ext = file.name.split(".").pop()?.toLowerCase();
  if (!["csv", "xlsx"].includes(ext ?? "")) {
    return NextResponse.json(
      { error: "Unsupported file type. Only CSV and XLSX are accepted." },
      { status: 400 }
    );
  }

  const job = await prisma.importJob.create({
    data: { fileName: file.name, createdById: session.user.id },
  });

  const buffer = await file.arrayBuffer();
  let rows: ImportRow[] = [];

  try {
    if (ext === "csv") {
      const text = new TextDecoder().decode(buffer);
      const result = Papa.parse<Record<string, string>>(text, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (h) => h.trim().toLowerCase().replace(/\s+/g, "_"),
      });
      rows = mapRows(result.data);
    } else {
      const wb = XLSX.read(buffer, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });
      rows = mapRows(
        raw.map((r) =>
          Object.fromEntries(
            Object.entries(r).map(([k, v]) => [
              k.trim().toLowerCase().replace(/\s+/g, "_"),
              String(v),
            ])
          )
        )
      );
    }
  } catch {
    await prisma.importJob.update({
      where: { id: job.id },
      data: { status: "FAILED", errors: [{ message: "Failed to parse file" }] },
    });
    return NextResponse.json({ error: "Failed to parse file" }, { status: 422 });
  }

  const result = await processImport(rows, job.id, session.user.id);

  return NextResponse.json({ jobId: job.id, ...result });
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user || !["ADMIN", "STAFF"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = 20;

  const [jobs, total] = await Promise.all([
    prisma.importJob.findMany({
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.importJob.count(),
  ]);

  return NextResponse.json({ jobs, total, page, pages: Math.ceil(total / limit) });
}

function mapRows(raw: Record<string, string>[]): ImportRow[] {
  return raw.map((r) => ({
    sku: r.sku ?? "",
    name: r.product_name ?? r.name ?? "",
    expiryDate: r.expiry_date ?? r.expiry ?? "",
    quantityRaw: r.quantity ?? "",
  }));
}
