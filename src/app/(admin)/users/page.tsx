"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import { UserPlus, CheckCircle, Ban, RefreshCw, Building2, KeyRound, MoreVertical } from "lucide-react";
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
  contact: { firstName: string | null; lastName: string | null; companyId: string | null; company: { name: string } | null } | null;
}

const statusBadge: Record<UserStatus, string> = {
  PENDING:   "bg-yellow-100 text-yellow-800 dark:bg-yellow-500/15 dark:text-yellow-400",
  ACTIVE:    "bg-green-100 text-green-800 dark:bg-green-500/15 dark:text-green-400",
  SUSPENDED: "bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-400",
};

const roleBadge: Record<UserRole, string> = {
  ADMIN:    "bg-purple-100 text-purple-800 dark:bg-purple-500/15 dark:text-purple-400",
  STAFF:    "bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-400",
  CUSTOMER: "bg-gray-100 text-gray-700 dark:bg-gray-500/15 dark:text-gray-400",
};

const inputClass = "w-full border border-[var(--rx-border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-[var(--rx-surface)] text-[var(--rx-text-strong)]";

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [staffPwError, setStaffPwError] = useState<string | null>(null);
  const [acting, setActing] = useState<string | null>(null);
  const [changePwUser, setChangePwUser] = useState<{ id: string; name: string } | null>(null);
  const [savingPw, setSavingPw] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const staffPwRef = useRef<HTMLInputElement>(null);
  const staffConfirmRef = useRef<HTMLInputElement>(null);
  const newPwRef = useRef<HTMLInputElement>(null);
  const confirmPwRef = useRef<HTMLInputElement>(null);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/users");
    if (res.ok) setUsers(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!openMenu) return;
    function closeOnOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpenMenu(null);
    }
    function closeOnScroll() { setOpenMenu(null); }
    document.addEventListener("mousedown", closeOnOutside);
    window.addEventListener("scroll", closeOnScroll, true);
    return () => {
      document.removeEventListener("mousedown", closeOnOutside);
      window.removeEventListener("scroll", closeOnScroll, true);
    };
  }, [openMenu]);

  function toggleMenu(id: string, e: React.MouseEvent<HTMLButtonElement>) {
    if (openMenu === id) { setOpenMenu(null); return; }
    const rect = e.currentTarget.getBoundingClientRect();
    setOpenMenu(id);
    setMenuPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
  }

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
    const pw = staffPwRef.current?.value ?? "";
    const confirm = staffConfirmRef.current?.value ?? "";
    if (pw !== confirm) { setStaffPwError("Passwords do not match"); return; }
    setStaffPwError(null);
    setCreating(true);
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName: fd.get("firstName"),
        lastName: fd.get("lastName"),
        email: fd.get("email"),
        password: pw,
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

  async function changePassword(id: string) {
    const newPw = newPwRef.current?.value ?? "";
    const confirmPw = confirmPwRef.current?.value ?? "";
    if (newPw.length < 8) { setPwError("Password must be at least 8 characters"); return; }
    if (newPw !== confirmPw) { setPwError("Passwords do not match"); return; }
    setSavingPw(true);
    const res = await fetch(`/api/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: newPw }),
    });
    setSavingPw(false);
    if (!res.ok) { const err = await res.json(); setPwError(err.error ?? "Failed to update password"); return; }
    toast.success("Password updated");
    setChangePwUser(null);
    setPwError(null);
    if (newPwRef.current) newPwRef.current.value = "";
    if (confirmPwRef.current) confirmPwRef.current.value = "";
  }

  const displayed = users.filter((u) => u.role !== "CUSTOMER");

  return (
    <div className="p-8 space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--rx-text-strong)]">User Management</h1>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="inline-flex items-center gap-2 h-9 px-4 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-all"
        >
          <UserPlus className="w-4 h-4" />
          Add Staff Account
        </button>
      </div>

      {showCreate && (
        <Card>
          <CardHeader><CardTitle className="text-base">Create Staff Account</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={createStaff} className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-[var(--rx-text-body)] block mb-1">First Name</label>
                <input
                  name="firstName"
                  required
                  minLength={1}
                  placeholder="John"
                  className={inputClass}
                  onChange={(e) => { e.target.value = e.target.value.replace(/[^A-Za-z]/g, ""); }}
                  onBlur={(e) => {
                    const v = e.target.value.trim();
                    if (v) e.target.value = v.charAt(0).toUpperCase() + v.slice(1).toLowerCase();
                  }}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-[var(--rx-text-body)] block mb-1">Last Name</label>
                <input
                  name="lastName"
                  required
                  minLength={1}
                  placeholder="Smith"
                  className={inputClass}
                  onChange={(e) => { e.target.value = e.target.value.replace(/[^A-Za-z\s-]/g, ""); }}
                  onBlur={(e) => {
                    const v = e.target.value.trim();
                    if (v) e.target.value = v.split(/\s+/).map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
                  }}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-[var(--rx-text-body)] block mb-1">Email Address</label>
                <input name="email" type="email" required placeholder="john@yourcompany.com" className={inputClass} />
              </div>
              <div>
                <label className="text-sm font-medium text-[var(--rx-text-body)] block mb-1">Temporary Password</label>
                <input
                  ref={staffPwRef}
                  name="password"
                  type="password"
                  required
                  minLength={8}
                  placeholder="Min 8 characters"
                  className={inputClass}
                  onChange={() => setStaffPwError(null)}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-[var(--rx-text-body)] block mb-1">Confirm Password</label>
                <input
                  ref={staffConfirmRef}
                  type="password"
                  required
                  placeholder="Re-enter password"
                  className={inputClass}
                  onChange={() => setStaffPwError(null)}
                />
                {staffPwError && <p className="text-xs text-red-500 mt-1">{staffPwError}</p>}
              </div>
              <div>
                <label className="text-sm font-medium text-[var(--rx-text-body)] block mb-1">Role</label>
                <select name="role" className={inputClass}>
                  <option value="STAFF">Staff</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
              <div className="col-span-2 flex gap-3">
                <button type="submit" disabled={creating} className="h-9 px-4 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-all">
                  {creating ? "Creating..." : "Create Account"}
                </button>
                <button type="button" onClick={() => setShowCreate(false)} className="h-9 px-4 rounded-lg text-sm font-medium border border-[var(--rx-border)] text-[var(--rx-text-body)] hover:bg-[var(--rx-border-subtle)] transition-all">
                  Cancel
                </button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="text-center py-12 text-[var(--rx-text-muted)] text-sm">Loading...</div>
      ) : displayed.length === 0 ? (
        <div className="text-center py-12 text-[var(--rx-text-muted)] text-sm bg-[var(--rx-surface)] rounded-xl border border-[var(--rx-border)]">
          No users found
        </div>
      ) : (
        <div className="bg-[var(--rx-surface)] rounded-xl border border-[var(--rx-border)] overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-[var(--rx-border)] bg-[var(--rx-border-subtle)]">
              <tr>
                <th className="px-4 py-3 text-center font-medium text-[var(--rx-text-secondary)]">First Name</th>
                <th className="px-4 py-3 text-center font-medium text-[var(--rx-text-secondary)]">Last Name</th>
                <th className="px-4 py-3 text-center font-medium text-[var(--rx-text-secondary)]">Email Address</th>
                <th className="px-4 py-3 text-center font-medium text-[var(--rx-text-secondary)]">Company</th>
                <th className="px-4 py-3 text-center font-medium text-[var(--rx-text-secondary)]">Role</th>
                <th className="px-4 py-3 text-center font-medium text-[var(--rx-text-secondary)]">Status</th>
                <th className="px-4 py-3 text-center font-medium text-[var(--rx-text-secondary)]">Registered</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--rx-border)]">
              {displayed.map((u) => (
                <tr key={u.id} className="hover:bg-[var(--rx-border-subtle)] transition-colors">
                  <td className="px-4 py-3 text-center font-medium text-[var(--rx-text-body)]">
                    {u.contact?.firstName ?? (u.name ? u.name.split(" ")[0] : "—")}
                  </td>
                  <td className="px-4 py-3 text-center text-[var(--rx-text-body)]">
                    {u.contact?.lastName ?? (u.name ? u.name.split(" ").slice(1).join(" ") || "—" : "—")}
                  </td>
                  <td className="px-4 py-3 text-center text-[var(--rx-text-muted)]">
                    {u.email}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {u.contact?.company ? (
                      <span className="inline-flex items-center justify-center gap-1 text-xs text-[var(--rx-text-secondary)]">
                        <Building2 className="w-3 h-3" /> {u.contact.company.name}
                      </span>
                    ) : (
                      <span className="text-xs text-[var(--rx-text-muted)]">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${roleBadge[u.role]}`}>{u.role}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge[u.status]}`}>{u.status}</span>
                  </td>
                  <td className="px-4 py-3 text-center text-[var(--rx-text-muted)]">
                    {new Date(u.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </td>
                  <td className="px-2 py-3">
                    <div className="flex justify-center">
                      <button
                        onClick={(e) => toggleMenu(u.id, e)}
                        className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-[var(--rx-border-subtle)] text-[var(--rx-text-muted)] transition-colors"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {openMenu && menuPos && (() => {
        const u = users.find((x) => x.id === openMenu);
        if (!u) return null;
        return (
          <div
            ref={menuRef}
            style={{ position: "fixed", top: menuPos.top, right: menuPos.right, zIndex: 50 }}
            className="bg-[var(--rx-surface)] border border-[var(--rx-border)] rounded-lg shadow-lg py-1 min-w-[170px]"
          >
            {u.status === "PENDING" && (
              <button
                onClick={() => { updateStatus(u.id, "ACTIVE"); setOpenMenu(null); }}
                disabled={acting === u.id}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-green-600 hover:bg-[var(--rx-border-subtle)] disabled:opacity-50 transition-colors"
              >
                <CheckCircle className="w-4 h-4" /> Approve
              </button>
            )}
            {u.status === "ACTIVE" && (
              <button
                onClick={() => { updateStatus(u.id, "SUSPENDED"); setOpenMenu(null); }}
                disabled={acting === u.id}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-[var(--rx-border-subtle)] disabled:opacity-50 transition-colors"
              >
                <Ban className="w-4 h-4" /> Suspend
              </button>
            )}
            {u.status === "SUSPENDED" && (
              <button
                onClick={() => { updateStatus(u.id, "ACTIVE"); setOpenMenu(null); }}
                disabled={acting === u.id}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[var(--rx-text-body)] hover:bg-[var(--rx-border-subtle)] disabled:opacity-50 transition-colors"
              >
                <RefreshCw className="w-4 h-4" /> Reactivate
              </button>
            )}
            <div className="border-t border-[var(--rx-border)] my-1" />
            <button
              onClick={() => { setChangePwUser({ id: u.id, name: u.contact?.firstName ?? u.name ?? u.email }); setPwError(null); setOpenMenu(null); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[var(--rx-text-body)] hover:bg-[var(--rx-border-subtle)] transition-colors"
            >
              <KeyRound className="w-4 h-4" /> Change Password
            </button>
          </div>
        );
      })()}

      {changePwUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-[var(--rx-surface)] rounded-xl border border-[var(--rx-border)] p-6 w-full max-w-sm shadow-xl">
            <h2 className="text-base font-semibold text-[var(--rx-text-strong)] mb-1">Change Password</h2>
            <p className="text-sm text-[var(--rx-text-secondary)] mb-4">
              Set a new password for <span className="font-medium text-[var(--rx-text-strong)]">{changePwUser.name}</span>
            </p>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-[var(--rx-text-body)] block mb-1">New Password</label>
                <input
                  ref={newPwRef}
                  type="password"
                  placeholder="Min 8 characters"
                  className={inputClass}
                  onChange={() => setPwError(null)}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-[var(--rx-text-body)] block mb-1">Confirm Password</label>
                <input
                  ref={confirmPwRef}
                  type="password"
                  placeholder="Re-enter password"
                  className={inputClass}
                  onChange={() => setPwError(null)}
                />
                {pwError && <p className="text-xs text-red-500 mt-1">{pwError}</p>}
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => changePassword(changePwUser.id)}
                disabled={savingPw}
                className="h-9 px-4 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-all"
              >
                {savingPw ? "Saving..." : "Update Password"}
              </button>
              <button
                onClick={() => { setChangePwUser(null); setPwError(null); if (newPwRef.current) newPwRef.current.value = ""; if (confirmPwRef.current) confirmPwRef.current.value = ""; }}
                className="h-9 px-4 rounded-lg text-sm font-medium border border-[var(--rx-border)] text-[var(--rx-text-body)] hover:bg-[var(--rx-border-subtle)] transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
