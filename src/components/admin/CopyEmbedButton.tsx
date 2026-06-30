"use client";

import { useState } from "react";
import { Code2, Check } from "lucide-react";

export default function CopyEmbedButton() {
  const [copied, setCopied] = useState(false);

  function copy() {
    const origin = window.location.origin;
    const snippet = `<iframe\n  src="${origin}/embed/catalog"\n  width="100%"\n  height="800"\n  style="border:none;border-radius:8px;"\n  title="RxPharmas Product Catalog"\n></iframe>`;
    navigator.clipboard.writeText(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      onClick={copy}
      className="inline-flex items-center gap-2 h-8 px-2.5 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-all"
    >
      {copied ? (
        <>
          <Check className="w-4 h-4 text-green-600" />
          Copied!
        </>
      ) : (
        <>
          <Code2 className="w-4 h-4" />
          Copy Embed Code
        </>
      )}
    </button>
  );
}
