import ImportStockClient from "@/components/admin/ImportStockClient";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

async function getRecentJobs() {
  return prisma.importJob.findMany({
    orderBy: { createdAt: "desc" },
    take: 10,
  });
}

const statusBadge: Record<string, { label: string; className: string }> = {
  PENDING: { label: "Pending", className: "bg-gray-100 text-gray-700" },
  PROCESSING: { label: "Processing", className: "bg-blue-100 text-blue-700" },
  COMPLETED: { label: "Completed", className: "bg-green-100 text-green-700" },
  FAILED: { label: "Failed", className: "bg-red-100 text-red-700" },
  PARTIAL: { label: "Partial", className: "bg-yellow-100 text-yellow-700" },
};

export default async function ImportPage() {
  const jobs = await getRecentJobs();

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Import Stock</h1>
        <p className="text-muted-foreground mt-1">
          Upload a CSV or Excel file to add newly ordered stock to inventory.
        </p>
      </div>

      <ImportStockClient />

      <div>
        <h2 className="text-lg font-semibold mb-4">Recent Import Jobs</h2>
        {jobs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No import jobs yet.</p>
        ) : (
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">File</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Imported</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Failed</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {jobs.map((job) => {
                  const badge = statusBadge[job.status] ?? statusBadge.PENDING;
                  return (
                    <tr key={job.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{job.fileName}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${badge.className}`}
                        >
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-green-700">{job.importedRows}</td>
                      <td className="px-4 py-3 text-red-600">{job.failedRows}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {job.createdAt.toLocaleDateString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
