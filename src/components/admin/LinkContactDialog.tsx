"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";

interface ContactOption {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  company: { name: string } | null;
}

interface Props {
  companyId: string;
  contacts: ContactOption[];
}

export default function LinkContactDialog({ companyId, contacts }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [linking, setLinking] = useState<string | null>(null);

  const filtered = contacts.filter((c) => {
    const q = search.toLowerCase();
    return (
      `${c.firstName} ${c.lastName}`.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q)
    );
  });

  async function link(contactId: string) {
    setLinking(contactId);
    const res = await fetch(`/api/crm/contacts/${contactId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ companyId }),
    });
    setLinking(null);
    if (!res.ok) { toast.error("Failed to link contact"); return; }
    toast.success("Contact linked to company");
    setOpen(false);
    setSearch("");
    router.refresh();
  }

  function close() {
    setOpen(false);
    setSearch("");
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 h-7 px-3 rounded-lg text-xs font-medium border border-border bg-background hover:bg-muted transition-all"
      >
        + Link Contact
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl border p-6 w-full max-w-sm shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-gray-900">Link Contact</h2>
              <button onClick={close} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or email..."
                className="w-full border rounded-lg pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="max-h-64 overflow-y-auto divide-y rounded-lg border">
              {filtered.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No contacts found</p>
              ) : (
                filtered.map((c) => (
                  <div key={c.id} className="flex items-center justify-between px-3 py-2.5 hover:bg-gray-50">
                    <div className="min-w-0 mr-3">
                      <p className="text-sm font-medium text-gray-900 truncate">{c.firstName} {c.lastName}</p>
                      <p className="text-xs text-muted-foreground truncate">{c.email}</p>
                      {c.company && (
                        <p className="text-xs text-amber-600 mt-0.5">Currently at {c.company.name}</p>
                      )}
                    </div>
                    <button
                      onClick={() => link(c.id)}
                      disabled={linking === c.id}
                      className="shrink-0 h-7 px-3 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-all"
                    >
                      {linking === c.id ? "..." : "Link"}
                    </button>
                  </div>
                ))
              )}
            </div>
            <button
              onClick={close}
              className="mt-3 w-full h-8 rounded-lg text-sm font-medium border border-border bg-background hover:bg-muted transition-all"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
