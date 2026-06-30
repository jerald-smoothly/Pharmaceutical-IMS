"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  title?: string | null;
  department?: string | null;
  companyId?: string | null;
  notes?: string | null;
}

interface Company { id: string; name: string; }

interface Props {
  children: React.ReactNode;
  contact?: Contact;
  companies: Company[];
}

export default function ContactFormDialog({ children, contact, companies }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const data: Record<string, string | null> = {};
    fd.forEach((v, k) => {
      const val = String(v).trim();
      data[k] = val || null;
    });

    const url = contact ? `/api/crm/contacts/${contact.id}` : "/api/crm/contacts";
    const method = contact ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    setLoading(false);

    if (!res.ok) {
      const err = await res.json();
      toast.error(err.error ?? "Failed to save contact");
      return;
    }

    toast.success(contact ? "Contact updated" : "Contact created");
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <span onClick={() => setOpen(true)} className="cursor-pointer">{children}</span>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{contact ? "Edit Contact" : "Add Contact"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={onSubmit} className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">First Name *</label>
                <input
                  name="firstName"
                  required
                  defaultValue={contact?.firstName ?? ""}
                  placeholder="John"
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onChange={(e) => { e.target.value = e.target.value.replace(/[^A-Za-z]/g, ""); }}
                  onBlur={(e) => {
                    const v = e.target.value.trim();
                    if (v) e.target.value = v.charAt(0).toUpperCase() + v.slice(1).toLowerCase();
                  }}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Last Name *</label>
                <input
                  name="lastName"
                  required
                  defaultValue={contact?.lastName ?? ""}
                  placeholder="Smith"
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onChange={(e) => { e.target.value = e.target.value.replace(/[^A-Za-z\s-]/g, ""); }}
                  onBlur={(e) => {
                    const v = e.target.value.trim();
                    if (v) e.target.value = v.split(/\s+/).map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
                  }}
                />
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium text-gray-700 block mb-1">Email *</label>
                <input name="email" type="email" required defaultValue={contact?.email ?? ""} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Phone</label>
                <input name="phone" defaultValue={contact?.phone ?? ""} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Title</label>
                <input name="title" defaultValue={contact?.title ?? ""} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Department</label>
                <input name="department" defaultValue={contact?.department ?? ""} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Company</label>
                <select name="companyId" defaultValue={contact?.companyId ?? ""} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                  <option value="">— None —</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium text-gray-700 block mb-1">Notes</label>
                <textarea name="notes" rows={3} defaultValue={contact?.notes ?? ""} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setOpen(false)} className="inline-flex items-center h-8 px-3 rounded-lg text-sm font-medium border border-border bg-background hover:bg-muted transition-all">Cancel</button>
              <button type="submit" disabled={loading} className="inline-flex items-center h-8 px-3 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/80 transition-all disabled:opacity-50">
                {loading ? "Saving..." : contact ? "Save Changes" : "Create Contact"}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
