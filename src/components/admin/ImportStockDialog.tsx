"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ImportStockClient from "./ImportStockClient";

interface ImportJob {
  id: string;
  fileName: string;
  createdAt: string;
  createdBy: { name: string | null; email: string | null } | null;
}

interface Props {
  children: React.ReactNode;
}

export default function ImportStockDialog({ children }: Props) {
  const [open, setOpen] = useState(false);
  const [jobs, setJobs] = useState<ImportJob[]>([]);

  const loadJobs = () => {
    fetch("/api/inventory/import")
      .then((r) => r.json())
      .then((d) => setJobs(d.jobs ?? []))
      .catch(() => {});
  };

  useEffect(() => {
    if (open) loadJobs();
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
            <ImportStockClient onImportComplete={loadJobs} />

            <div>
              <h3 className="text-sm font-semibold mb-3">Recent Imports</h3>
              {jobs.length === 0 ? (
                <p className="text-sm text-muted-foreground">No imports yet.</p>
              ) : (
                <div className="rounded-lg border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2.5 text-left font-medium text-gray-600">File Name</th>
                        <th className="px-4 py-2.5 text-left font-medium text-gray-600">Import Date &amp; Time</th>
                        <th className="px-4 py-2.5 text-left font-medium text-gray-600">Imported By</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {jobs.map((job) => {
                        const dt = new Date(job.createdAt);
                        const importedBy = job.createdBy?.name ?? job.createdBy?.email ?? "Unknown";
                        return (
                          <tr key={job.id} className="hover:bg-gray-50">
                            <td className="px-4 py-2.5 font-medium truncate max-w-[220px]">{job.fileName}</td>
                            <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">
                              {dt.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}{" "}
                              {dt.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                            </td>
                            <td className="px-4 py-2.5 text-muted-foreground">{importedBy}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
