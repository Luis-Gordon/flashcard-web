import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import type { ExportResult } from "@/lib/export/types";

// ---------------------------------------------------------------------------
// Browser API stubs
// ---------------------------------------------------------------------------

const fakeUrl = "blob:http://localhost/fake-object-url";
const mockCreateObjectURL = vi.fn(() => fakeUrl);
const mockRevokeObjectURL = vi.fn();

// Only stub the static methods, preserving the URL constructor
URL.createObjectURL = mockCreateObjectURL;
URL.revokeObjectURL = mockRevokeObjectURL;

let clickSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  mockCreateObjectURL.mockClear();
  mockRevokeObjectURL.mockClear();
  clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
});

afterEach(() => {
  clickSpy.mockRestore();
});

const importDownload = () => import("@/lib/export/download");

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("triggerDownload", () => {
  const stringResult: ExportResult = {
    content: "front,back\nQ,A",
    mimeType: "text/csv;charset=utf-8",
    filename: "flashcards.csv",
  };

  const bufferResult: ExportResult = {
    content: new ArrayBuffer(8),
    mimeType: "application/zip",
    filename: "deck.apkg",
  };

  test("string content calls createObjectURL with a Blob", async () => {
    const { triggerDownload } = await importDownload();
    triggerDownload(stringResult);
    expect(mockCreateObjectURL).toHaveBeenCalledOnce();
    expect(mockCreateObjectURL).toHaveBeenCalledWith(expect.any(Blob));
  });

  test("ArrayBuffer content calls createObjectURL with a Blob", async () => {
    const { triggerDownload } = await importDownload();
    triggerDownload(bufferResult);
    expect(mockCreateObjectURL).toHaveBeenCalledOnce();
    expect(mockCreateObjectURL).toHaveBeenCalledWith(expect.any(Blob));
  });

  test("created anchor has correct download filename and href", async () => {
    const { triggerDownload } = await importDownload();

    // Spy on appendChild to capture the anchor element
    const appendSpy = vi.spyOn(document.body, "appendChild");
    triggerDownload(stringResult);

    const anchor = appendSpy.mock.calls[0]![0] as HTMLAnchorElement;
    expect(anchor.download).toBe("flashcards.csv");
    expect(anchor.href).toBe(fakeUrl);

    appendSpy.mockRestore();
  });

  test("a.click() is called", async () => {
    const { triggerDownload } = await importDownload();
    triggerDownload(stringResult);
    expect(clickSpy).toHaveBeenCalledOnce();
  });

  test("revokeObjectURL called with the same URL from createObjectURL", async () => {
    const { triggerDownload } = await importDownload();
    triggerDownload(stringResult);
    expect(mockRevokeObjectURL).toHaveBeenCalledWith(fakeUrl);
  });
});
