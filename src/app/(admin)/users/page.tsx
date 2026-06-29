"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { UserPlus, CheckCircle, Ban, RefreshCw, Building2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type UserStatus = "PENDING" | "ACTIVE" | "SUSPENDED";
type UserRole = "ADMIN" | "STAFF" | "CUSTOMER";

interface User {
  id: string;
  name: string | null;
  email: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  contact: { companyId: string | null; company: { name: string } | null } | null;
}

const statusBadge: Record<UserStatus, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  ACTIVE: "bg-green-100 text-green-800",
  SUSPENDED: "bg-red-100 text-red-800",
};

const roleBadge: Record<UserRole, string> = {
  ADMIN: "bg-purple-100 text-purple-800",
  STAFF: "bg-blue-100 text-blue-800",
  CUSTOMER: "bg-gray-100 text-gray-700",
};

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"pending" | "all">("pending");
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [acting, setActing] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/users");
    if (res.ok) setUsers(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function updateStatus(id: string, status: UserStatus) {
    setActing(id);
    const res = await fetch(`/api/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setActing(null);
    if (!res.ok) { toast.error("Failed to update user"); return; }
    toast.success(`User ${status === "ACTIVE" ? "approved" : status === "SUSPENDED" ? "suspended" : "updated"}`);
    load();
  }

  async function createStaff(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setCreating(true);
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: fd.get("name"),
        email: fd.get("email"),
        password: fd.get("password"),
        role: fd.get("role"),
      }),
    });
    setCreating(false);
    if (!res.ok) {
      const err = await res.json();
      toast.error(err.error ?? "Failed to create user");
      return;
    }
    toast.success("Staff account created");
    setShowCreate(false);
    load();
    (e.target as HTMLFormElement).reset();
  }

  const pending = users.filter((u) => u.status === "PENDING");
  const displayed = tab === "pending" ? pending : users;

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Manage staff accounts and approve customer registrations</p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="inline-flex items-center gap-2 h-9 px-4 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-all"
        >
          <UserPlus className="w-4 h-4" />
          Add staff account
        </button>
      </div>

      {showCreate && (
        <Card>
          <CardHeader><CardTitle className="text-base">Create staff account</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={createStaff} className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Full name</label>
                <input name="name" required minLength={2} placeholder="Jane Smith" className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Email</label>
                <input name="email" type="email" required placeholder="jane@yourcompany.com" className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Temporary password</label>
                <input name="password" type="password" required minLength={8} placeholder="Min 8 characters" className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Role</label>
                <select name="role" className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="STAFF">Staff</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
              <div className="col-span-2 flex gap-3">
                <button type="submit" disabled={creating} className="h-9 px-4 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-all">
                  {creating ? "Creating..." : "Create account"}
                </button>
                <button type="button" onClick={() => setShowCreate(false)} className="h-9 px-4 rounded-lg text-sm font-medium border hover:bg-gray-50 transition-all">
                  Cancel
                </button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-1 border-b">
        <button
          onClick={() => setTab("pending")}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${tab === "pending" ? "border-blue-600 text-blue-700" : "border-transparent text-gray-500 hover:text-gray-700"}`}
        >
          Pending approval
          {pending.length > 0 && (
            <span className="ml-2 inline-flex items-center justify-center w-5 h-5 rounded-full bg-yellow-100 text-yellow-800 text-xs font-bold">{pending.length}</span>
          )}
        </button>
        <button
          onClick={() => setTab("all")}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${tab === "all" ? "border-blue-600 text-blue-700" : "border-transparent text-gray-500 hover:text-gray-700"}`}
        >
          All users
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground text-sm">Loading...</div>
      ) : displayed.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm bg-white rounded-xl border">
          {tab === "pending" ? "No pending registrations" : "No users found"}
        </div>
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">User</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Company</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Role</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Registered</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {displayed.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium">{u.name ?? "—"}</p>
                    <p className="text-xs text-muted-foreground">{u.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    {u.contact?.company ? (
                      <span className="inline-flex items-center gap-1 text-xs text-gray-600">
                        <Building2 className="w-3 h-3" /> {u.contact.company.name}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${roleBadge[u.role]}`}>{u.role}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge[u.status]}`}>{u.status}</span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(u.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      {u.status === "PENDING" && (
                        <button
                          onClick={() => updateStatus(u.id, "ACTIVE")}
                          disabled={acting === u.id}
                          className="inline-flex items-center gap-1 h-7 px-3 rounded-lg text-xs font-medium bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 transition-all"
                        >
                          <CheckCircle className="w-3 h-3" /> Approve
                        </button>
                      )}
                      {u.status === "ACTIVE" && (
                        <button
                          onClick={() => updateStatus(u.id, "SUSPENDED")}
                          disabled={acting === u.id}
                          className="inline-flex items-center gap-1 h-7 px-3 rounded-lg text-xs font-medium border border-red-300 text-red-600 hover:bg-red-50 disabled:opacity-50 transition-all"
                        >
                          <Ban className="w-3 h-3" /> Suspend
                        </button>
                      )}
                      {u.status === "SUSPENDED" && (
                        <button
                          onClick={() => updateStatus(u.id, "ACTIVE")}
                          disabled={acting === u.id}
                          className="inline-flex items-center gap-1 h-7 px-3 rounded-lg text-xs font-medium border text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-all"
                        >
                          <RefreshCw className="w-3 h-3" /> Reactivate
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
