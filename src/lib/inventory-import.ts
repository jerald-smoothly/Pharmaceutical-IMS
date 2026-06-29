import { prisma } from "@/lib/db";

export interface ImportRow {
  sku: string;
  name: string;
  genericName?: string;
  manufacturer?: string;
  category?: string;
  unit?: string;
  unitPrice: number;
  batchNumber: string;
  expiryDate: string;
  quantity: number;
  costPrice?: number;
  supplier?: string;
  requiresPrescription?: boolean;
}

export interface ImportResult {
  importedRows: number;
  failedRows: number;
  errors: { row: number; message: string }[];
}

export async function processImport(
  rows: ImportRow[],
  jobId: string,
  userId?: string
): Promise<ImportResult> {
  const errors: { row: number; message: string }[] = [];
  let importedRows = 0;
  let failedRows = 0;

  await prisma.importJob.update({
    where: { id: jobId },
    data: { status: "PROCESSING", totalRows: rows.length },
  });

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2; // 1-indexed + header row

    try {
      if (!row.sku || !row.name || !row.batchNumber || !row.expiryDate || !row.quantity) {
        throw new Error("Missing required fields: sku, name, batchNumber, expiryDate, quantity");
      }

      const expiryDate = new Date(row.expiryDate);
      if (isNaN(expiryDate.getTime())) {
        throw new Error(`Invalid expiry date: ${row.expiryDate}`);
      }

      if (row.quantity <= 0) {
        throw new Error("Quantity must be positive");
      }

      await prisma.$transaction(async (tx) => {
        const product = await tx.product.upsert({
          where: { sku: row.sku },
          update: {
            name: row.name,
            genericName: row.genericName,
            manufacturer: row.manufacturer,
            category: row.category,
            unit: row.unit ?? "box",
            unitPrice: row.unitPrice,
            requiresPrescription: row.requiresPrescription ?? false,
          },
          create: {
            sku: row.sku,
            name: row.name,
            genericName: row.genericName,
            manufacturer: row.manufacturer,
            category: row.category,
            unit: row.unit ?? "box",
            unitPrice: row.unitPrice,
            requiresPrescription: row.requiresPrescription ?? false,
          },
        });

        await tx.productBatch.upsert({
          where: {
            productId_batchNumber: {
              productId: product.id,
              batchNumber: row.batchNumber,
            },
          },
          update: {
            quantityIn: { increment: row.quantity },
            costPrice: row.costPrice ? row.costPrice : undefined,
            supplier: row.supplier,
            importJobId: jobId,
          },
          create: {
            productId: product.id,
            batchNumber: row.batchNumber,
            expiryDate,
            quantityIn: row.quantity,
            costPrice: row.costPrice ? row.costPrice : undefined,
            supplier: row.supplier,
            importJobId: jobId,
          },
        });
      });

      importedRows++;
    } catch (err) {
      failedRows++;
      errors.push({
        row: rowNum,
        message: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  const finalStatus =
    failedRows === 0 ? "COMPLETED" : importedRows === 0 ? "FAILED" : "PARTIAL";

  await prisma.importJob.update({
    where: { id: jobId },
    data: {
      status: finalStatus,
      importedRows,
      failedRows,
      errors: errors.length > 0 ? errors : undefined,
      completedAt: new Date(),
    },
  });

  if (userId) {
    await prisma.auditLog.create({
      data: {
        userId,
        action: "INVENTORY_IMPORT",
        entity: "ImportJob",
        entityId: jobId,
        after: { importedRows, failedRows, status: finalStatus },
      },
    });
  }

  return { importedRows, failedRows, errors };
}
