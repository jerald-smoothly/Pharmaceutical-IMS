"use client";

import { useRouter, usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

interface Props {
  placeholder: string;
  defaultValue: string;
  /** Any extra URL params (sort, dir, status, etc.) to preserve when search changes */
  preserveParams?: Record<string, string>;
  className?: string;
}

export default function SearchInput({ placeholder, defaultValue, preserveParams = {}, className }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [value, setValue] = useState(defaultValue);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  // Sync if parent re-renders with a different defaultValue (e.g. browser back/forward)
  useEffect(() => { setValue(defaultValue); }, [defaultValue]);

  function push(query: string) {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const params = new URLSearchParams();
      if (query) params.set("search", query);
      params.set("page", "1");
      for (const [k, v] of Object.entries(preserveParams)) {
        if (v) params.set(k, v);
      }
      router.push(`${pathname}?${params.toString()}`);
    }, 300);
  }

  return (
    <input
      value={value}
      onChange={(e) => { setValue(e.target.value); push(e.target.value); }}
      placeholder={placeholder}
      className={className ?? "flex-1 border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"}
    />
  );
}
