import type { ExportResult } from "./types";

/**
 * Trigger a browser file download from an ExportResult.
 *
 * Creates a temporary object URL → hidden <a> click → revokes URL.
 * Works for both string content (CSV/Markdown/JSON) and ArrayBuffer (APKG).
 */
export function triggerDownload(result: ExportResult): void {
  const blob =
    result.content instanceof ArrayBuffer
      ? new Blob([result.content], { type: result.mimeType })
      : new Blob([result.content], { type: result.mimeType });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = result.filename;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
