"use client";

import { Check, Copy } from "lucide-react";
import { useCallback, useState } from "react";

const COPIED_RESET_MS = 1500;

/** A shell command in a pill with a copy button. Client-only because it uses the clipboard. */
export function CopyCommand({ command }: { command: string }) {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      setTimeout(() => setCopied(false), COPIED_RESET_MS);
    } catch {
      // Clipboard can be blocked (insecure context); the text is still selectable.
    }
  }, [command]);

  return (
    <div className="inline-flex items-center gap-3 rounded-lg border bg-fd-card py-2 pr-2 pl-4 font-mono text-sm">
      <span className="text-fd-muted-foreground">$</span>
      <code>{command}</code>
      <button
        aria-label={copied ? "Copied" : "Copy command"}
        className="rounded-md p-2 text-fd-muted-foreground transition-colors hover:bg-fd-accent hover:text-fd-foreground"
        onClick={copy}
        type="button"
      >
        {copied ? <Check size={14} /> : <Copy size={14} />}
      </button>
    </div>
  );
}
