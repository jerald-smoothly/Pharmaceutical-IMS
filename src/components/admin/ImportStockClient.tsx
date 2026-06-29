"use client";

import { useState, useRef, useCallback } from "react";
import { Upload, FileSpreadsheet, CheckCircle, XCircle, AlertCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

interface ImportResult {
  jobId: string;
  importedRows: number;
  failedRows: number;
  errors: { row: number; message: string }[];
}

export default function ImportStockClient() {
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (f: File) => {
    const ext = f.name.split(".").pop()?.toLowerCase();
    if (!["csv", "xlsx", "xls"].includes(ext ?? "")) {
      toast.error("Only CSV and Excel files are supported.");
      return;
    }
    setFile(f);
    setResult(null);
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, []);

  const upload = async () => {
    if (!file) return;
    setUploading(true);
    setProgress(30);

    try {
      const form = new FormData();
      form.append("file", file);

      setProgress(60);
      const res = await fetch("/api/inventory/import", { method: "POST", body: form });
      setProgress(90);
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error ?? "Import failed");
        return;
      }

      setResult(data);
      setProgress(100);

      if (data.failedRows === 0) {
        toast.success(`Imported ${data.importedRows} rows successfully.`);
      } else if (data.importedRows > 0) {
        toast.warning(`Imported ${data.importedRows} rows. ${data.failedRows} rows failed.`);
      } else {
        toast.error(`Import failed. All ${data.failedRows} rows had errors.`);
      }
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const reset = () => {
    setFile(null);
    setResult(null);
    setProgress(0);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-6">
          <div
            className={`border-2 border-dashed rounded-xl p-10 text-center transition-colors ${
              dragging ? "border-blue-400 bg-blue-50" : "border-gray-200 hover:border-gray-300"
            }`}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
          >
            <FileSpreadsheet className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-base font-medium text-gray-700 mb-1">
              Drop your file here, or{" "}
              <button
                className="text-blue-600 hover:underline"
                onClick={() => inputRef.current?.click()}
              >
                browse
              </button>
            </p>
            <p className="text-sm text-muted-foreground">Supports CSV, XLSX, XLS</p>
            <input
              ref={inputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
          </div>

          {file && (
            <div className="mt-4 flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3">
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="w-5 h-5 text-blue-500" />
                <div>
                  <p className="text-sm font-medium">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              </div>
              <button onClick={reset} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {uploading && (
            <div className="mt-4">
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-muted-foreground mt-1 text-center">Processing...</p>
            </div>
          )}

          <div className="mt-4 flex items-center gap-3">
            <Button onClick={upload} disabled={!file || uploading} className="flex-1">
              <Upload className="w-4 h-4 mr-2" />
              {uploading ? "Importing..." : "Import Stock"}
            </Button>
            <a
              href="/templates/stock-import-template.csv"
              download
              className="inline-flex items-center h-8 px-2.5 rounded-lg text-sm font-medium border border-border bg-background hover:bg-muted transition-all"
            >
              Download Template
            </a>
          </div>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold mb-4">Import Results</h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="flex items-center gap-3 bg-green-50 rounded-lg p-4">
                <CheckCircle className="w-6 h-6 text-green-600 shrink-0" />
                <div>
                  <p className="text-2xl font-bold text-green-700">{result.importedRows}</p>
                  <p className="text-sm text-green-600">Rows imported</p>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-red-50 rounded-lg p-4">
                <XCircle className="w-6 h-6 text-red-600 shrink-0" />
                <div>
                  <p className="text-2xl font-bold text-red-700">{result.failedRows}</p>
                  <p className="text-sm text-red-600">Rows failed</p>
                </div>
              </div>
            </div>

            {result.errors.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-amber-700">
                  <AlertCircle className="w-4 h-4" />
                  Errors
                </div>
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {result.errors.map((e, i) => (
                    <div key={i} className="text-sm bg-red-50 rounded px-3 py-2">
                      <span className="font-medium">Row {e.row}:</span> {e.message}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-6">
          <h3 className="font-semibold mb-2">Expected Columns</h3>
          <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
            {[
              ["sku *", "Unique product code"],
              ["name *", "Product name"],
              ["batch_number *", "Batch/lot number"],
              ["expiry_date *", "YYYY-MM-DD format"],
              ["quantity *", "Units received"],
              ["unit_price *", "Selling price per unit"],
              ["generic_name", "INN / generic name"],
              ["manufacturer", "Manufacturer name"],
              ["category", "Product category"],
              ["unit", "box, vial, tablet, etc."],
              ["cost_price", "Purchase cost"],
              ["supplier", "Supplier name"],
              ["requires_prescription", "yes / no"],
            ].map(([col, desc]) => (
              <div key={col} className="flex gap-2">
                <code className="bg-gray-100 px-1 rounded text-gray-700 shrink-0">{col}</code>
                <span>{desc}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
