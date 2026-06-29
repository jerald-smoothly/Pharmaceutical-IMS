"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface Company {
  id: string;
  name: string;
  industry?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  postalCode?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  taxId?: string | null;
  notes?: string | null;
}

interface Props {
  children: React.ReactNode;
  company?: Company;
}

const fields = [
  { name: "name", label: "Company Name *", required: true, colSpan: 2 },
  { name: "industry", label: "Industry", colSpan: 1 },
  { name: "email", label: "Email", type: "email", colSpan: 1 },
  { name: "phone", label: "Phone", colSpan: 1 },
  { name: "website", label: "Website", colSpan: 1 },
  { name: "address", label: "Address", colSpan: 2 },
  { name: "city", label: "City", colSpan: 1 },
  { name: "state", label: "State / Province", colSpan: 1 },
  { name: "postalCode", label: "Postal Code", colSpan: 1 },
  { name: "country", label: "Country", colSpan: 1 },
  { name: "taxId", label: "Tax ID", colSpan: 1 },
];

export default function CompanyFormDialog({ children, company }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const data: Record<string, string> = {};
    fd.forEach((v, k) => { if (String(v).trim()) data[k] = String(v).trim(); });

    const url = company ? `/api/crm/companies/${company.id}` : "/api/crm/companies";
    const method = company ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    setLoading(false);

    if (!res.ok) {
      toast.error("Failed to save company");
      return;
    }

    toast.success(company ? "Company updated" : "Company created");
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <span onClick={() => setOpen(true)} className="cursor-pointer">{children}</span>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{company ? "Edit Company" : "Add Company"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={onSubmit} className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-4">
              {fields.map((f) => (
                <div key={f.name} className={f.colSpan === 2 ? "col-span-2" : ""}>
                  <label className="text-sm font-medium text-gray-700 block mb-1">{f.label}</label>
                  <input
                    name={f.name}
                    type={f.type ?? "text"}
                    required={f.required}
                    defaultValue={company ? (company[f.name as keyof Company] as string) ?? "" : ""}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              ))}
              <div className="col-span-2">
                <label className="text-sm font-medium text-gray-700 block mb-1">Notes</label>
                <textarea
                  name="notes"
                  rows={3}
                  defaultValue={company?.notes ?? ""}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex items-center h-8 px-3 rounded-lg text-sm font-medium border border-border bg-background hover:bg-muted transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center h-8 px-3 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/80 transition-all disabled:opacity-50"
              >
                {loading ? "Saving..." : company ? "Save Changes" : "Create Company"}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
