import { prisma } from "@/lib/db";

export interface ImportRow {
  sku: string;
  name: string;
  expiryDate: string;
  quantityRaw: string;
}

export interface ImportResult {
  importedRows: number;
  failedRows: number;
  skippedRows: number;
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
  let skippedRows = 0;

  await prisma.importJob.update({
    where: { id: jobId },
    data: { status: "PROCESSING", totalRows: rows.length },
  });

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2;

    try {
      if (!row.sku) throw new Error("Missing required field: SKU");
      if (!row.expiryDate) throw new Error("Missing required field: Expiry Date");

      const trimmed = row.quantityRaw.trim();
      if (trimmed === "") {
        skippedRows++;
        continue;
      }

      const qty = parseInt(trimmed, 10);
      if (isNaN(qty) || qty === 0) {
        skippedRows++;
        continue;
      }

      const expiryDate = new Date(row.expiryDate);
      if (isNaN(expiryDate.getTime())) {
        throw new Error(`Invalid expiry date: ${row.expiryDate}`);
      }

      await prisma.$transaction(async (tx) => {
        const product = await tx.product.findUnique({ where: { sku: row.sku } });
        if (!product) throw new Error(`Product with SKU "${row.sku}" not found`);

        const existingBatch = await tx.productBatch.findFirst({
          where: { productId: product.id, expiryDate },
        });

        if (qty > 0) {
          if (existingBatch) {
            await tx.productBatch.update({
              where: { id: existingBatch.id },
              data: { quantityIn: { increment: qty }, importJobId: jobId },
            });
          } else {
            await tx.productBatch.create({
              data: {
                productId: product.id,
                batchNumber: `IMP-${expiryDate.toISOString().slice(0, 10)}-${Date.now()}`,
                expiryDate,
                quantityIn: qty,
                importJobId: jobId,
              },
            });
          }
        } else {
          if (!existingBatch) {
            throw new Error(`No batch found for SKU "${row.sku}" with expiry ${row.expiryDate}`);
          }
          const absQty = Math.abs(qty);
          const available =
            existingBatch.quantityIn - existingBatch.quantityOut - existingBatch.quantityOnHold;
          if (absQty > available) {
            throw new Error(
              `Insufficient stock: trying to remove ${absQty} but only ${available} available`
            );
          }
          await tx.productBatch.update({
            where: { id: existingBatch.id },
            data: { quantityOut: { increment: absQty }, importJobId: jobId },
          });
        }
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
        after: { importedRows, failedRows, skippedRows, status: finalStatus },
      },
    });
  }

  return { importedRows, failedRows, skippedRows, errors };
}
