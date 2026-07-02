"use client";

import { useState, useEffect, useRef } from "react";
import { Columns, GripVertical } from "lucide-react";
import type { ColDef } from "./ColumnPicker";

export type { ColDef };

export function useEditColumns(storageKey: string, defaultColumns: ColDef[]) {
  const defaultKeys = defaultColumns.map((c) => c.key);
  const [order, setOrderState] = useState<string[]>(defaultKeys);
  const [hidden, setHiddenState] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (!saved) return;
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        // backwards compat: old ColumnPicker format stored hidden keys as flat array
        setHiddenState(new Set(parsed.filter((k: string) => defaultKeys.includes(k))));
      } else if (parsed && typeof parsed === "object") {
        if (Array.isArray(parsed.order)) {
          setOrderState([
            ...parsed.order.filter((k: string) => defaultKeys.includes(k)),
            ...defaultKeys.filter((k) => !parsed.order.includes(k)),
          ]);
        }
        if (Array.isArray(parsed.hidden)) {
          setHiddenState(new Set(parsed.hidden.filter((k: string) => defaultKeys.includes(k))));
        }
      }
    } catch { /* ignore */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  function persist(newOrder: string[], newHidden: Set<string>) {
    localStorage.setItem(storageKey, JSON.stringify({ order: newOrder, hidden: [...newHidden] }));
  }

  function setOrder(keys: string[]) {
    setOrderState(keys);
    persist(keys, hidden);
  }

  function setHidden(next: Set<string>) {
    setHiddenState(next);
    persist(order, next);
  }

  const allOrdered: ColDef[] = order
    .map((k) => defaultColumns.find((c) => c.key === k)!)
    .filter(Boolean);

  const orderedVisible = allOrdered.filter((c) => !hidden.has(c.key));
  const visible = new Set(orderedVisible.map((c) => c.key));

  function onVisibleChange(nextVisible: Set<string>) {
    setHidden(new Set(order.filter((k) => !nextVisible.has(k))));
  }

  return { orderedVisible, allOrdered, hidden, visible, setOrder, setHidden, onVisibleChange };
}

interface Props {
  columns: ColDef[];
  hidden: Set<string>;
  onOrder: (keys: string[]) => void;
  onHidden: (next: Set<string>) => void;
}

export function EditColumns({ columns, hidden, onOrder, onHidden }: Props) {
  const [open, setOpen] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function outside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", outside);
    return () => document.removeEventListener("mousedown", outside);
  }, []);

  function toggle(key: string) {
    const next = new Set(hidden);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    onHidden(next);
  }

  function handleDragStart(e: React.DragEvent, index: number) {
    setDragIndex(index);
    e.dataTransfer.effectAllowed = "move";
    // transparent drag image so the row itself appears to move
    e.dataTransfer.setDragImage(e.currentTarget as HTMLElement, 0, 0);
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverIndex(index);
  }

  function handleDrop(e: React.DragEvent, index: number) {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index) {
      setDragIndex(null);
      setDragOverIndex(null);
      return;
    }
    const keys = columns.map((c) => c.key);
    const reordered = [...keys];
    const [removed] = reordered.splice(dragIndex, 1);
    reordered.splice(index, 0, removed);
    onOrder(reordered);
    setDragIndex(null);
    setDragOverIndex(null);
  }

  function handleDragEnd() {
    setDragIndex(null);
    setDragOverIndex(null);
  }

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-2 h-9 px-3 rounded-lg text-sm font-medium border border-border bg-background hover:bg-muted transition-all"
      >
        <Columns className="w-4 h-4" />
        Edit Columns
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 w-56 rounded-lg border border-border bg-[var(--rx-surface)] shadow-lg p-2">
          <p className="text-xs text-muted-foreground px-2 pb-1.5 border-b border-border mb-1.5">
            Drag to reorder · check to show
          </p>
          {columns.map((col, i) => (
            <div
              key={col.key}
              draggable
              onDragStart={(e) => handleDragStart(e, i)}
              onDragOver={(e) => handleDragOver(e, i)}
              onDrop={(e) => handleDrop(e, i)}
              onDragEnd={handleDragEnd}
              className={`flex items-center gap-1.5 px-2 py-1.5 rounded select-none transition-colors ${
                dragIndex === i
                  ? "opacity-40"
                  : dragOverIndex === i && dragIndex !== null
                  ? "bg-primary/10 border border-primary/30"
                  : "hover:bg-muted"
              }`}
            >
              <GripVertical className="w-3.5 h-3.5 text-muted-foreground shrink-0 cursor-grab active:cursor-grabbing" />
              <input
                type="checkbox"
                checked={!hidden.has(col.key)}
                onChange={() => toggle(col.key)}
                className="accent-primary shrink-0 cursor-pointer"
              />
              <span className="text-sm flex-1 truncate cursor-grab active:cursor-grabbing">{col.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
