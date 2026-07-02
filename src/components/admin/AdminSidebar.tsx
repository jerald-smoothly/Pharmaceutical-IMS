"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";

const workspaceNav = [
  {
    label: "Dashboard", href: "/dashboard",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="9" rx="1.2"/><rect x="14" y="3" width="7" height="5" rx="1.2"/>
        <rect x="14" y="12" width="7" height="9" rx="1.2"/><rect x="3" y="16" width="7" height="5" rx="1.2"/>
      </svg>
    ),
  },
  {
    label: "Inventory", href: "/inventory",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
        <path d="m3.3 7 8.7 5 8.7-5M12 22V12"/>
      </svg>
    ),
  },
  {
    label: "Contacts", href: "/crm/contacts",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
        <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13A4 4 0 0 1 16 11"/>
      </svg>
    ),
  },
  {
    label: "Companies", href: "/crm/companies",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="2" width="16" height="20" rx="2"/>
        <path d="M9 22v-4h6v4M9 6h.01M15 6h.01M9 10h.01M15 10h.01M9 14h.01M15 14h.01"/>
      </svg>
    ),
  },
  {
    label: "Orders", href: "/orders",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/>
        <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>
      </svg>
    ),
  },
];

const adminNav = [
  {
    label: "Users", href: "/users",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="7" r="3"/><path d="M2 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/>
        <circle cx="19" cy="11" r="2"/><path d="M19 8v1M19 13v1M21.6 9.5l-.87.5M17.27 12l-.87.5M21.6 12.5l-.87-.5M17.27 11l-.87-.5"/>
      </svg>
    ),
    adminOnly: true,
  },
  {
    label: "Settings", href: "/settings",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3"/>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-2.82 1.17V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 8 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 3.6 14H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 8a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 10 3.6V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 2.82 1.17l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 20.4 10H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
      </svg>
    ),
  },
];

interface Props {
  user: { name?: string | null; email?: string | null; role?: string | null };
}

export default function AdminSidebar({ user }: Props) {
  const pathname = usePathname();
  const isAdmin = user.role === "ADMIN";

  const initials = (user.name ?? user.email ?? "U")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <aside className="w-64 shrink-0 bg-[var(--rx-sb-bg)] border-r border-[var(--rx-sb-border)] flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 py-[22px] flex items-center gap-[11px] border-b border-[var(--rx-sb-border)]">
        <div className="w-[38px] h-[38px] rounded-[11px] bg-[#3b6fd4] flex items-center justify-center shadow-[0_4px_12px_-3px_rgba(59,111,212,0.55)]">
          <span className="font-mono font-semibold text-[15px] text-white tracking-tight">Rx</span>
        </div>
        <div className="leading-tight">
          <div className="font-semibold text-[15px] text-[var(--rx-sb-text-strong)] tracking-tight">RxPharmas</div>
          <div className="text-[11.5px] text-[var(--rx-sb-text-muted)] font-medium">
            Inventory · {isAdmin ? "Admin" : "Staff"}
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-[14px] flex flex-col gap-0.5 overflow-y-auto">
        <div className="px-3 py-1.5 text-[10.5px] font-semibold tracking-[0.7px] uppercase text-[var(--rx-sb-section)] mb-1">
          Workspace
        </div>

        {workspaceNav.map(({ label, href, icon }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-[11px] px-3 py-[9px] rounded-[9px] text-[13.5px] font-medium transition-colors",
                active
                  ? "bg-[var(--rx-sb-active-bg)] text-[var(--rx-sb-active-text)] font-semibold"
                  : "text-[var(--rx-sb-text)] hover:bg-[var(--rx-sb-hover)]"
              )}
            >
              <span className={active ? "text-[var(--rx-sb-active-text)]" : "text-[var(--rx-sb-icon)]"}>
                {icon}
              </span>
              {label}
            </Link>
          );
        })}

        <div className="px-3 pt-4 pb-2 text-[10.5px] font-semibold tracking-[0.7px] uppercase text-[var(--rx-sb-section)] mt-1">
          Administration
        </div>

        {adminNav
          .filter((item) => !("adminOnly" in item && item.adminOnly && !isAdmin))
          .map(({ label, href, icon }) => {
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-[11px] px-3 py-[9px] rounded-[9px] text-[13.5px] font-medium transition-colors",
                  active
                    ? "bg-[var(--rx-sb-active-bg)] text-[var(--rx-sb-active-text)] font-semibold"
                    : "text-[var(--rx-sb-text)] hover:bg-[var(--rx-sb-hover)]"
                )}
              >
                <span className={active ? "text-[var(--rx-sb-active-text)]" : "text-[var(--rx-sb-icon)]"}>
                  {icon}
                </span>
                {label}
              </Link>
            );
          })}
      </nav>

      {/* User footer */}
      <div className="px-3 pb-4 pt-3 border-t border-[var(--rx-sb-border)]">
        <div className="flex items-center gap-[10px] px-1.5 py-1.5 pb-2.5">
          <div className="w-[34px] h-[34px] rounded-full bg-[var(--rx-sb-active-bg)] flex items-center justify-center text-[12.5px] font-semibold text-[var(--rx-sb-active-text)] shrink-0">
            {initials}
          </div>
          <div className="min-w-0">
            <div className="text-[13px] font-semibold text-[var(--rx-sb-text-strong)] truncate">{user.name ?? user.email}</div>
            <div className="text-[11.5px] text-[var(--rx-sb-text-muted)] truncate">{user.email}</div>
          </div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full flex items-center justify-center gap-[10px] px-3 py-[9px] rounded-[9px] text-[13px] font-medium text-[var(--rx-sb-text)] hover:bg-[var(--rx-sb-hover)] transition-colors"
        >
          <span className="text-[var(--rx-sb-icon)]" style={{ lineHeight: 0 }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>
            </svg>
          </span>
          Sign out
        </button>
      </div>
    </aside>
  );
}
