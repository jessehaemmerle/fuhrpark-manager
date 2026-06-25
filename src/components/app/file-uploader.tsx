"use client";

import { Loader2, Paperclip, Upload, X } from "lucide-react";
import { useRef, useState } from "react";

type FileUploaderProps = {
  name: string;
  kind?: "photo" | "document";
  label?: string;
  max?: number;
  initialUrls?: string[];
};

export function FileUploader({ name, kind = "photo", label = "Dateien hochladen", max = 8, initialUrls = [] }: FileUploaderProps) {
  const [urls, setUrls] = useState<string[]>(initialUrls);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const accept = kind === "document" ? "image/jpeg,image/png,image/webp,application/pdf" : "image/jpeg,image/png,image/webp";

  async function handleFiles(fileList: FileList | null) {
    const files = Array.from(fileList ?? []);
    if (files.length === 0) return;

    setBusy(true);
    setError(null);
    try {
      const body = new FormData();
      body.set("kind", kind);
      for (const file of files) body.append("file", file);

      const response = await fetch("/api/uploads", { method: "POST", credentials: "same-origin", body });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(payload.error ?? "Upload fehlgeschlagen.");
        return;
      }
      setUrls((prev) => [...prev, ...(payload.urls as string[])].slice(0, max));
    } catch {
      setError("Upload fehlgeschlagen. Bitte erneut versuchen.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function removeAt(index: number) {
    setUrls((prev) => prev.filter((_, i) => i !== index));
  }

  return (
    <div className="grid gap-2">
      <input type="hidden" name={name} value={urls.join("\n")} />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy || urls.length >= max}
        className="flex items-center justify-center gap-2 rounded-md border border-dashed px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-zinc-50 disabled:opacity-60"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Upload className="h-4 w-4" aria-hidden />}
        {label} ({urls.length}/{max})
      </button>
      <input ref={inputRef} type="file" accept={accept} multiple className="hidden" onChange={(event) => handleFiles(event.target.files)} />
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {urls.length > 0 ? (
        <ul className="grid gap-1">
          {urls.map((url, index) => (
            <li key={url} className="flex items-center justify-between gap-2 rounded-md border bg-white px-2 py-1 text-xs">
              <a href={url} target="_blank" rel="noreferrer" className="flex min-w-0 items-center gap-2 text-primary">
                <Paperclip className="h-3.5 w-3.5 shrink-0" aria-hidden />
                <span className="truncate">{url.split("/").pop()}</span>
              </a>
              <button type="button" onClick={() => removeAt(index)} aria-label="Entfernen" className="text-muted-foreground hover:text-red-600">
                <X className="h-3.5 w-3.5" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
