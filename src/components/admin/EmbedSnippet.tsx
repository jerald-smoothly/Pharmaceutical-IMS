"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

export default function EmbedSnippet({ origin }: { origin: string }) {
  const [copied, setCopied] = useState(false);

  const snippet = `<iframe
  src="${origin}/embed/catalog"
  width="100%"
  height="800"
  style="border:none;border-radius:8px;"
  title="RxPharmas Product Catalog"
></iframe>`;

  function copy() {
    navigator.clipboard.writeText(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="relative">
      <pre className="bg-gray-950 text-gray-100 rounded-lg p-4 text-xs overflow-x-auto leading-relaxed">
        {snippet}
      </pre>
      <button
        onClick={copy}
        className="absolute top-3 right-3 inline-flex items-center gap-1.5 h-7 px-3 rounded-md text-xs font-medium bg-gray-800 text-gray-200 hover:bg-gray-700 transition-all"
      >
        {copied ? <><Check className="w-3 h-3 text-green-400" /> Copied</> : <><Copy className="w-3 h-3" /> Copy</>}
      </button>
      <p className="text-xs text-muted-foreground mt-2">
        Preview: <a href={`${origin}/embed/catalog`} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">{origin}/embed/catalog</a>
      </p>
    </div>
  );
}
