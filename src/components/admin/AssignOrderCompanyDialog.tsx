"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";

interface CompanyOption { id: string; name: string; }

interface Props {
  orderId: string;
  currentCompanyId: string | null;
  companies: CompanyOption[];
}

export default function AssignOrderCompanyDialog({ orderId, currentCompanyId, companies }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(currentCompanyId ?? "");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const res = await fetch(`/api/orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ companyId: selected || null }),
    });
    setSaving(false);
    if (!res.ok) { toast.error("Failed to update company"); return; }
    toast.success(selected ? "Company assigned" : "Company removed");
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <button
        onClick={() => { setSelected(currentCompanyId ?? ""); setOpen(true); }}
        className="text-xs text-blue-600 hover:underline font-medium"
      >
        {currentCompanyId ? "Change" : "Assign"}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl border p-6 w-full max-w-sm shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-gray-900">Assign Company</h2>
              <button onClick={() => setOpen(false)}>
                <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
              </button>
            </div>
            <select
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white mb-5"
            >
              <option value="">— No Company —</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <div className="flex gap-3">
              <button
                onClick={save}
                disabled={saving}
                className="h-8 px-4 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-all"
              >
                {saving ? "Saving..." : "Save"}
              </button>
              <button
                onClick={() => setOpen(false)}
                className="h-8 px-4 rounded-lg text-sm font-medium border border-border bg-background hover:bg-muted transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
