"use client";

import { useRef, useState } from "react";

/**
 * Small "upload a script" control. Reads a .txt / .docx / .pdf file, extracts
 * its text on the server, and hands it back via onText so it can fill a field.
 */
export function ScriptUpload({
  onText,
  label = "Upload script",
}: {
  onText: (text: string) => void;
  label?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [okName, setOkName] = useState<string | null>(null);

  async function handleFile(file: File) {
    setBusy(true);
    setError(null);
    setOkName(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/extract-text", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not read that file.");
      } else {
        onText(data.text as string);
        setOkName(file.name);
      }
    } catch {
      setError("Could not reach the server.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <input
        ref={inputRef}
        type="file"
        accept=".txt,.md,.rtf,.docx,.pdf,text/plain"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
        }}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        className="inline-flex items-center gap-1.5 rounded-full border border-white/20 px-3 py-1 text-xs font-medium text-neutral-200 hover:bg-white/10 disabled:opacity-50"
      >
        {busy ? "Reading…" : `⬆ ${label}`}
      </button>
      {okName && (
        <span className="text-[11px] text-emerald-300">Loaded “{okName}”</span>
      )}
      {error && <span className="text-[11px] text-red-400">{error}</span>}
      {!okName && !error && !busy && (
        <span className="text-[11px] text-neutral-500">Word, PDF or text</span>
      )}
    </span>
  );
}
