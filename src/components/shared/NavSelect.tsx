"use client";

import { useRouter, usePathname } from "next/navigation";

interface Props {
  name: string;
  defaultValue: string;
  preserveParams?: Record<string, string>;
  className?: string;
  children: React.ReactNode;
}

export default function NavSelect({ name, defaultValue, preserveParams = {}, className, children }: Props) {
  const router = useRouter();
  const pathname = usePathname();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const params = new URLSearchParams();
    if (e.target.value) params.set(name, e.target.value);
    params.set("page", "1");
    for (const [k, v] of Object.entries(preserveParams)) {
      if (v) params.set(k, v);
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <select value={defaultValue} onChange={handleChange} className={className}>
      {children}
    </select>
  );
}
