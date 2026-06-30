"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface Props {
  contactId: string;
}

export default function UnlinkContactButton({ contactId }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function unlink() {
    setLoading(true);
    const res = await fetch(`/api/crm/contacts/${contactId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ companyId: null }),
    });
    setLoading(false);
    if (!res.ok) { toast.error("Failed to unlink contact"); return; }
    toast.success("Contact unlinked");
    router.refresh();
  }

  return (
    <button
      onClick={unlink}
      disabled={loading}
      className="text-xs text-red-500 hover:text-red-700 hover:underline disabled:opacity-50 transition-colors"
    >
      {loading ? "..." : "Unlink"}
    </button>
  );
}
