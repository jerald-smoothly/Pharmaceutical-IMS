"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ImportStockClient from "./ImportStockClient";

interface ImportJob {
  id: string;
  fileName: string;
  status: string;
  importedRows: number;
  failedRows: number;
  createdAt: string;
}

const statusBadge: Record<string, { label: string; className: string }> = {
  PENDING: { label: "Pending", className: "bg-gray-100 text-gray-700" },
  PROCESSING: { label: "Processing", className: "bg-blue-100 text-blue-700" },
  COMPLETED: { label: "Completed", className: "bg-green-100 text-green-700" },
  FAILED: { label: "Failed", className: "bg-red-100 text-red-700" },
  PARTIAL: { label: "Partial", className: "bg-yellow-100 text-yellow-700" },
};

interface Props {
  children: React.ReactNode;
}

export default function ImportStockDialog({ children }: Props) {
  const [open, setOpen] = useState(false);
  const [jobs, setJobs] = useState<ImportJob[]>([]);

  useEffect(() => {
    if (!open) return;
    fetch("/api/inventory/import")
      .then((r) => r.json())
      .then((d) => setJobs(d.jobs ?? []))
      .catch(() => {});
  }, [open]);

  return (
    <>
      <span onClick={() => setOpen(true)} className="cursor-pointer">{children}</span>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Import Stock</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 pt-2">
            <ImportStockClient />

            {jobs.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-3">Recent Import Jobs</h3>
                <div className="rounded-lg border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left font-medium text-gray-600">File</th>
                        <th className="px-4 py-2 text-left font-medium text-gray-600">Status</th>
                        <th className="px-4 py-2 text-left font-medium text-gray-600">Updated</th>
                        <th className="px-4 py-2 text-left font-medium text-gray-600">Failed</th>
                        <th className="px-4 py-2 text-left font-medium text-gray-600">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {jobs.map((job) => {
                        const badge = statusBadge[job.status] ?? statusBadge.PENDING;
                        return (
                          <tr key={job.id} className="hover:bg-gray-50">
                            <td className="px-4 py-2 font-medium truncate max-w-[180px]">{job.fileName}</td>
                            <td className="px-4 py-2">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${badge.className}`}>
                                {badge.label}
                              </span>
                            </td>
                            <td className="px-4 py-2 text-green-700">{job.importedRows}</td>
                            <td className="px-4 py-2 text-red-600">{job.failedRows}</td>
                            <td className="px-4 py-2 text-muted-foreground">
                              {new Date(job.createdAt).toLocaleDateString()}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
