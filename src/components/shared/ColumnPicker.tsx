"use client";

import { useState, useRef, useEffect } from "react";
import { SlidersHorizontal, Plus, X } from "lucide-react";

export interface ColDef {
  key: string;
  label: string;
  type?: "text" | "date";
}

export type FilterCondition =
  // text conditions
  | "is_equal_to_any_of"
  | "is_not_equal_to_any_of"
  | "contains_exactly"
  | "does_not_contain_exactly"
  // date conditions
  | "date_is"
  | "date_is_before"
  | "date_is_after"
  | "date_is_between"
  // shared
  | "is_known"
  | "is_unknown";

export interface FilterRule {
  id: string;
  attribute: string;
  condition: FilterCondition;
  // text
  values: string[];
  text: string;
  // date (YYYY-MM-DD strings from <input type="date">)
  dateValue: string;
  dateValue2: string;
}

const TEXT_CONDITIONS: { value: FilterCondition; label: string }[] = [
  { value: "is_equal_to_any_of",       label: "is equal to any of" },
  { value: "is_not_equal_to_any_of",   label: "is not equal to any of" },
  { value: "contains_exactly",         label: "contains exactly" },
  { value: "does_not_contain_exactly", label: "doesn't contain exactly" },
  { value: "is_known",                 label: "is known" },
  { value: "is_unknown",               label: "is unknown" },
];

const DATE_CONDITIONS: { value: FilterCondition; label: string }[] = [
  { value: "date_is",         label: "is on" },
  { value: "date_is_before",  label: "is before" },
  { value: "date_is_after",   label: "is after" },
  { value: "date_is_between", label: "is between" },
  { value: "is_known",        label: "is known" },
  { value: "is_unknown",      label: "is unknown" },
];

function isMultiValue(c: FilterCondition) {
  return c === "is_equal_to_any_of" || c === "is_not_equal_to_any_of";
}
function isText(c: FilterCondition) {
  return c === "contains_exactly" || c === "does_not_contain_exactly";
}
function isDateCond(c: FilterCondition) {
  return c === "date_is" || c === "date_is_before" || c === "date_is_after" || c === "date_is_between";
}

export function applyFilters<T>(
  rows: T[],
  rules: FilterRule[],
  getValue: (row: T, key: string) => unknown
): T[] {
  if (rules.length === 0) return rows;
  return rows.filter((row) =>
    rules.every((rule) => {
      const raw = getValue(row, rule.attribute);
      const val = String(raw ?? "").toLowerCase().trim();
      switch (rule.condition) {
        case "is_equal_to_any_of":
          return rule.values.length === 0 || rule.values.some((v) => val === v.toLowerCase().trim());
        case "is_not_equal_to_any_of":
          return rule.values.length === 0 || !rule.values.some((v) => val === v.toLowerCase().trim());
        case "contains_exactly":
          return !rule.text.trim() || val.includes(rule.text.toLowerCase().trim());
        case "does_not_contain_exactly":
          return !rule.text.trim() || !val.includes(rule.text.toLowerCase().trim());
        case "date_is":
          if (!rule.dateValue) return true;
          return String(raw ?? "") === rule.dateValue;
        case "date_is_before":
          if (!rule.dateValue) return true;
          return !!raw && String(raw) < rule.dateValue;
        case "date_is_after":
          if (!rule.dateValue) return true;
          return !!raw && String(raw) > rule.dateValue;
        case "date_is_between": {
          if (!rule.dateValue && !rule.dateValue2) return true;
          if (!raw) return false;
          const s = String(raw);
          return (!rule.dateValue || s >= rule.dateValue) && (!rule.dateValue2 || s <= rule.dateValue2);
        }
        case "is_known":
          return raw !== null && raw !== undefined && String(raw).trim() !== "";
        case "is_unknown":
          return raw === null || raw === undefined || String(raw).trim() === "";
        default:
          return true;
      }
    })
  );
}

function defaultCondition(col: ColDef | undefined): FilterCondition {
  return col?.type === "date" ? "date_is" : "is_equal_to_any_of";
}

function makeRule(columns: ColDef[]): FilterRule {
  const col = columns[0];
  return {
    id: Math.random().toString(36).slice(2),
    attribute: col?.key ?? "",
    condition: defaultCondition(col),
    values: [],
    text: "",
    dateValue: "",
    dateValue2: "",
  };
}

interface Props {
  columns: ColDef[];
  onFilter: (rules: FilterRule[]) => void;
}

export function ColumnPicker({ columns, onFilter }: Props) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<FilterRule[]>([]);
  const [applied, setApplied] = useState<FilterRule[]>([]);
  const [valueInputs, setValueInputs] = useState<Record<string, string>>({});
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  function openPanel() {
    setDraft(applied.map((r) => ({ ...r, values: [...r.values] })));
    setValueInputs({});
    setOpen(true);
  }

  function updateRule(id: string, patch: Partial<FilterRule>) {
    setDraft((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function removeRule(id: string) {
    setDraft((prev) => prev.filter((r) => r.id !== id));
  }

  function commitValue(id: string) {
    const text = (valueInputs[id] ?? "").trim();
    if (!text) return;
    setDraft((prev) => prev.map((r) => (r.id === id ? { ...r, values: [...r.values, text] } : r)));
    setValueInputs((prev) => ({ ...prev, [id]: "" }));
  }

  function removeValue(id: string, val: string) {
    setDraft((prev) =>
      prev.map((r) => (r.id === id ? { ...r, values: r.values.filter((v) => v !== val) } : r))
    );
  }

  function apply() {
    setApplied(draft);
    onFilter(draft);
    setOpen(false);
  }

  function clearAll() {
    const empty: FilterRule[] = [];
    setDraft(empty);
    setApplied(empty);
    onFilter(empty);
    setOpen(false);
  }

  const selectCls = "w-full border border-border rounded-lg px-2.5 py-[7px] text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/50";
  const inputCls = `${selectCls} placeholder:text-muted-foreground/60`;
  const dateCls = `${selectCls} text-sm`;

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        onClick={() => (open ? setOpen(false) : openPanel())}
        className="inline-flex items-center gap-2 h-9 px-3 rounded-lg text-sm font-medium border border-border bg-background hover:bg-muted transition-all"
      >
        <SlidersHorizontal className="w-4 h-4" />
        Advanced Filter
        {applied.length > 0 && (
          <span className="inline-flex items-center justify-center w-[18px] h-[18px] rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
            {applied.length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 w-[360px] rounded-xl border border-border bg-background shadow-xl flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
            <span className="font-semibold text-sm">Advanced Filter</span>
            <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Rules */}
          <div className="overflow-y-auto max-h-[min(60vh,420px)] px-4 py-3 space-y-3">
            {draft.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">No filters added yet.</p>
            )}

            {draft.map((rule, i) => {
              const col = columns.find((c) => c.key === rule.attribute);
              const isDate = col?.type === "date";
              const conditions = isDate ? DATE_CONDITIONS : TEXT_CONDITIONS;

              return (
                <div key={rule.id}>
                  {i > 0 && (
                    <p className="text-[10.5px] font-semibold text-muted-foreground tracking-widest uppercase mb-2">
                      AND
                    </p>
                  )}
                  <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
                    {/* Attribute */}
                    <div className="flex items-center gap-2">
                      <select
                        value={rule.attribute}
                        onChange={(e) => {
                          const newCol = columns.find((c) => c.key === e.target.value);
                          updateRule(rule.id, {
                            attribute: e.target.value,
                            condition: defaultCondition(newCol),
                            values: [],
                            text: "",
                            dateValue: "",
                            dateValue2: "",
                          });
                        }}
                        className={`flex-1 border border-border rounded-lg px-2.5 py-[7px] text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/50`}
                      >
                        {columns.map((c) => (
                          <option key={c.key} value={c.key}>{c.label}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => removeRule(rule.id)}
                        className="shrink-0 text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Condition */}
                    <select
                      value={rule.condition}
                      onChange={(e) =>
                        updateRule(rule.id, {
                          condition: e.target.value as FilterCondition,
                          values: [],
                          text: "",
                          dateValue: "",
                          dateValue2: "",
                        })
                      }
                      className={selectCls}
                    >
                      {conditions.map((c) => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </select>

                    {/* Date inputs */}
                    {isDate && isDateCond(rule.condition) && rule.condition !== "date_is_between" && (
                      <input
                        type="date"
                        value={rule.dateValue}
                        onChange={(e) => updateRule(rule.id, { dateValue: e.target.value })}
                        className={dateCls}
                      />
                    )}
                    {isDate && rule.condition === "date_is_between" && (
                      <div className="flex items-center gap-2">
                        <input
                          type="date"
                          value={rule.dateValue}
                          onChange={(e) => updateRule(rule.id, { dateValue: e.target.value })}
                          className={`flex-1 border border-border rounded-lg px-2.5 py-[7px] text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/50`}
                        />
                        <span className="text-xs text-muted-foreground shrink-0">and</span>
                        <input
                          type="date"
                          value={rule.dateValue2}
                          onChange={(e) => updateRule(rule.id, { dateValue2: e.target.value })}
                          className={`flex-1 border border-border rounded-lg px-2.5 py-[7px] text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/50`}
                        />
                      </div>
                    )}

                    {/* Multi-value chips (text) */}
                    {!isDate && isMultiValue(rule.condition) && (
                      <div className="space-y-1.5">
                        {rule.values.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {rule.values.map((v) => (
                              <span
                                key={v}
                                className="inline-flex items-center gap-1 bg-primary/10 text-primary text-xs font-medium px-2 py-0.5 rounded-full"
                              >
                                {v}
                                <button onClick={() => removeValue(rule.id, v)} className="hover:text-primary/60 transition-colors">
                                  <X className="w-2.5 h-2.5" />
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                        <input
                          type="text"
                          value={valueInputs[rule.id] ?? ""}
                          onChange={(e) =>
                            setValueInputs((prev) => ({ ...prev, [rule.id]: e.target.value }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") { e.preventDefault(); commitValue(rule.id); }
                          }}
                          placeholder="Type to add a value to this filter"
                          className={inputCls}
                        />
                        <p className="text-[10px] text-muted-foreground">Press Enter to add each value</p>
                      </div>
                    )}

                    {/* Single text */}
                    {!isDate && isText(rule.condition) && (
                      <input
                        type="text"
                        value={rule.text}
                        onChange={(e) => updateRule(rule.id, { text: e.target.value })}
                        placeholder="Type to filter…"
                        className={inputCls}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="px-4 py-3 border-t border-border space-y-3 shrink-0">
            <button
              onClick={() => setDraft((prev) => [...prev, makeRule(columns)])}
              className="inline-flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add filter
            </button>
            <div className="flex items-center justify-between">
              <button onClick={clearAll} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Clear all
              </button>
              <button
                onClick={apply}
                className="inline-flex items-center h-8 px-4 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
