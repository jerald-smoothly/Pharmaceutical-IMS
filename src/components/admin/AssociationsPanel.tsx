"use client";

import Link from "next/link";

export interface AssocItem {
  id: string;
  label: string;
  sublabel?: string;
  href: string;
}

interface SectionProps {
  title: string;
  note?: string;
  items: AssocItem[];
  action?: React.ReactNode;
  emptyText?: string;
}

export function AssocSection({ title, note, items, action, emptyText }: SectionProps) {
  return (
    <div className="p-4 border-b last:border-0">
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-muted-foreground">
            {title}
          </span>
          {note && (
            <span className="text-[10px] text-gray-400 dark:text-muted-foreground/60">· via {note}</span>
          )}
          {items.length > 0 && (
            <span className="text-[10px] font-semibold bg-gray-100 dark:bg-[var(--rx-surface-raised)] text-gray-500 dark:text-muted-foreground px-1.5 py-0.5 rounded-full">
              {items.length}
            </span>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground">{emptyText ?? "None"}</p>
      ) : (
        <ul className="space-y-0.5">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                href={item.href}
                className="flex items-center justify-between py-1.5 px-2 -mx-2 rounded-lg hover:bg-gray-50 dark:hover:bg-[var(--rx-surface-raised)] group transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-sm text-gray-800 dark:text-foreground group-hover:text-blue-600 dark:group-hover:text-blue-400 truncate leading-snug">
                    {item.label}
                  </p>
                  {item.sublabel && (
                    <p className="text-xs text-muted-foreground truncate">{item.sublabel}</p>
                  )}
                </div>
                <span className="text-gray-300 dark:text-muted-foreground/40 group-hover:text-blue-400 ml-2 shrink-0">→</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function AssociationsPanel({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-white dark:bg-[var(--rx-surface)] shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b bg-gray-50 dark:bg-[var(--rx-surface-raised)]">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-muted-foreground">
          Associations
        </h3>
      </div>
      {children}
    </div>
  );
}
