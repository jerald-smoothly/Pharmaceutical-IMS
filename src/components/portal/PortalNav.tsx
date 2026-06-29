"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Package, ClipboardList, LogOut, Settings } from "lucide-react";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";

const nav = [
  { label: "Catalog", href: "/catalog", icon: Package },
  { label: "My Orders", href: "/my-orders", icon: ClipboardList },
  { label: "Settings", href: "/settings", icon: Settings },
];

interface Props {
  user: { name?: string | null; email?: string | null };
}

export default function PortalNav({ user }: Props) {
  const pathname = usePathname();

  return (
    <header className="bg-white border-b sticky top-0 z-10">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
              <Package className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-semibold text-sm">RxPharmas</span>
          </div>
          <nav className="flex items-center gap-1">
            {nav.map(({ label, href, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                  pathname.startsWith(href)
                    ? "bg-blue-50 text-blue-700"
                    : "text-gray-600 hover:bg-gray-100"
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">{user.name ?? user.email}</span>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
