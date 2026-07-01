"use client";

import { useState, useEffect, useRef } from "react";
import { SlidersHorizontal } from "lucide-react";

export interface ColDef {
  key: string;
  label: string;
}

/**
 * Stores HIDDEN keys so new columns default to visible when added later.
 */
export function useColumnPicker(storageKey: string, columns: ColDef[]) {
  const allKeys = columns.map((c) => c.key);
  const [hidden, setHidden] = useState<Set<string>>(new Set());

  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as string[];
        setHidden(new Set(parsed.filter((k) => allKeys.includes(k))));
      } catch { /* ignore */ }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  const visible = new Set(allKeys.filter((k) => !hidden.has(k)));

  function onChange(nextVisible: Set<string>) {
    const nextHidden = new Set(allKeys.filter((k) => !nextVisible.has(k)));
    setHidden(nextHidden);
    localStorage.setItem(storageKey, JSON.stringify([...nextHidden]));
  }

  return { visible, onChange };
}

interface Props {
  columns: ColDef[];
  visible: Set<string>;
  onChange: (next: Set<string>) => void;
}

export function ColumnPicker({ columns, visible, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function outside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", outside);
    return () => document.removeEventListener("mousedown", outside);
  }, []);

  function toggle(key: string) {
    const next = new Set(visible);
    if (next.has(key)) {
      if (next.size === 1) return;
      next.delete(key);
    } else {
      next.add(key);
    }
    onChange(next);
  }

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-2 h-9 px-3 rounded-lg text-sm font-medium border border-border bg-background hover:bg-muted transition-all"
      >
        <SlidersHorizontal className="w-4 h-4" />
        Advanced Filter
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 w-48 rounded-lg border border-border bg-[var(--rx-surface)] shadow-lg p-2">
          {columns.map((col) => (
            <label
              key={col.key}
              className="flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer hover:bg-muted text-sm select-none"
            >
              <input
                type="checkbox"
                checked={visible.has(col.key)}
                onChange={() => toggle(col.key)}
                className="accent-primary"
              />
              {col.label}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
