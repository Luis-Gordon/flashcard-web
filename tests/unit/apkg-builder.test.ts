import { describe, test, expect, vi, beforeEach } from "vitest";
import { APKG_SCHEMA } from "@/lib/apkg/schema";

// ---------------------------------------------------------------------------
// Module-level mocks for sql.js and jszip
// ---------------------------------------------------------------------------

const mockRun = vi.fn();
const mockExport = vi.fn(() => new Uint8Array([1, 2, 3]));
const mockClose = vi.fn();

// Must use a regular function (not arrow) so it can be called with `new`
function MockDatabase() {
  return { run: mockRun, export: mockExport, close: mockClose };
}

vi.mock("sql.js", () => ({
  default: vi.fn(() => Promise.resolve({ Database: MockDatabase })),
}));

const mockZipFile = vi.fn();
const mockGenerateAsync = vi.fn(() => Promise.resolve(new ArrayBuffer(8)));

// Must use a regular function so it can be called with `new`
function MockJSZip() {
  return { file: mockZipFile, generateAsync: mockGenerateAsync };
}

vi.mock("jszip", () => ({
  default: MockJSZip,
}));

// Lazy import so mocks are in place before the module loads
const importBuilder = () => import("@/lib/apkg/builder");

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  mockRun.mockClear();
  mockExport.mockClear();
  mockClose.mockClear();
  mockZipFile.mockClear();
  mockGenerateAsync.mockClear();
});

function makeCards(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    front: `Q${i + 1}`,
    back: `A${i + 1}`,
    tags: i === 0 ? ["math", "algebra"] : undefined,
  }));
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

describe("generateApkg — validation", () => {
  test("throws for empty card array", async () => {
    const { generateApkg } = await importBuilder();
    await expect(
      generateApkg({ deckName: "Test", cards: [] }),
    ).rejects.toThrow("At least one card is required");
  });

  test("throws for more than 2000 cards", async () => {
    const { generateApkg } = await importBuilder();
    const cards = makeCards(2001);
    await expect(
      generateApkg({ deckName: "Test", cards }),
    ).rejects.toThrow("2000");
  });
});

// ---------------------------------------------------------------------------
// Database operations
// ---------------------------------------------------------------------------

describe("generateApkg — database operations", () => {
  test("first db.run call uses APKG_SCHEMA DDL", async () => {
    const { generateApkg } = await importBuilder();
    await generateApkg({ deckName: "Test", cards: makeCards(1) });
    expect(mockRun.mock.calls[0]![0]).toBe(APKG_SCHEMA);
  });

  test("INSERT INTO col call contains deck name in params", async () => {
    const { generateApkg } = await importBuilder();
    await generateApkg({ deckName: "My Vocabulary", cards: makeCards(1) });

    const colCall = mockRun.mock.calls.find(
      (c) => typeof c[0] === "string" && c[0].includes("INSERT INTO col"),
    );
    expect(colCall).toBeDefined();

    // The params array contains JSON strings — one of them should include the deck name
    const params = colCall![1] as unknown[];
    const hasName = params.some(
      (p) => typeof p === "string" && p.includes("My Vocabulary"),
    );
    expect(hasName).toBe(true);
  });

  test("INSERT INTO col does not contain a phantom Default deck", async () => {
    const { generateApkg } = await importBuilder();
    await generateApkg({ deckName: "Test Deck", cards: makeCards(1) });

    const colCall = mockRun.mock.calls.find(
      (c) => typeof c[0] === "string" && c[0].includes("INSERT INTO col"),
    );
    expect(colCall).toBeDefined();

    // Find the decks JSON param (contains deck name)
    const params = colCall![1] as unknown[];
    const decksParam = params.find(
      (p) => typeof p === "string" && p.includes("Test Deck"),
    ) as string;
    expect(decksParam).toBeDefined();

    // Should not contain a separate "Default" deck entry
    const parsed = JSON.parse(decksParam);
    const deckNames = Object.values(parsed).map(
      (d) => (d as { name: string }).name,
    );
    expect(deckNames).not.toContain("Default");
    expect(deckNames).toContain("Test Deck");
  });

  test("3 cards produce 3 INSERT INTO notes + 3 INSERT INTO cards", async () => {
    const { generateApkg } = await importBuilder();
    await generateApkg({ deckName: "Test", cards: makeCards(3) });

    const noteInserts = mockRun.mock.calls.filter(
      (c) => typeof c[0] === "string" && c[0].includes("INSERT INTO notes"),
    );
    const cardInserts = mockRun.mock.calls.filter(
      (c) => typeof c[0] === "string" && c[0].includes("INSERT INTO cards"),
    );
    expect(noteInserts).toHaveLength(3);
    expect(cardInserts).toHaveLength(3);
  });

  test("card with tags produces space-padded tag string", async () => {
    const { generateApkg } = await importBuilder();
    const cards = [{ front: "Q", back: "A", tags: ["math", "algebra"] }];
    await generateApkg({ deckName: "Test", cards });

    const noteInsert = mockRun.mock.calls.find(
      (c) => typeof c[0] === "string" && c[0].includes("INSERT INTO notes"),
    );
    const params = noteInsert![1] as unknown[];
    // tags is the 6th parameter (index 5) in the INSERT INTO notes call
    expect(params[5]).toBe(" math algebra ");
  });

  test("card with no tags produces empty string", async () => {
    const { generateApkg } = await importBuilder();
    const cards = [{ front: "Q", back: "A" }];
    await generateApkg({ deckName: "Test", cards });

    const noteInsert = mockRun.mock.calls.find(
      (c) => typeof c[0] === "string" && c[0].includes("INSERT INTO notes"),
    );
    const params = noteInsert![1] as unknown[];
    expect(params[5]).toBe("");
  });
});

// ---------------------------------------------------------------------------
// ZIP packaging
// ---------------------------------------------------------------------------

describe("generateApkg — ZIP packaging", () => {
  test("zip.file called with collection.anki2 and media", async () => {
    const { generateApkg } = await importBuilder();
    await generateApkg({ deckName: "Test", cards: makeCards(1) });

    expect(mockZipFile).toHaveBeenCalledWith(
      "collection.anki2",
      expect.any(Uint8Array),
    );
    expect(mockZipFile).toHaveBeenCalledWith("media", "{}");
  });

  test("returns correct result shape", async () => {
    const { generateApkg } = await importBuilder();
    const result = await generateApkg({
      deckName: "My Deck",
      cards: makeCards(5),
    });

    expect(result).toEqual({
      data: expect.any(ArrayBuffer),
      cardCount: 5,
      deckName: "My Deck",
    });
  });
});

// ---------------------------------------------------------------------------
// Progress and cancellation
// ---------------------------------------------------------------------------

describe("generateApkg — progress and cancellation", () => {
  test("150 cards triggers onProgress at least twice", async () => {
    const { generateApkg } = await importBuilder();
    const onProgress = vi.fn();
    await generateApkg({
      deckName: "Test",
      cards: makeCards(150),
      onProgress,
    });

    // At least one batch boundary call + final progress(1)
    expect(onProgress.mock.calls.length).toBeGreaterThanOrEqual(2);
    // Last call should be 1 (100%)
    expect(onProgress).toHaveBeenLastCalledWith(1);
  });

  test("aborted signal throws and still closes db", async () => {
    const { generateApkg } = await importBuilder();
    const controller = new AbortController();
    controller.abort();

    await expect(
      generateApkg({
        deckName: "Test",
        cards: makeCards(150),
        signal: controller.signal,
      }),
    ).rejects.toThrow("Export was cancelled");

    expect(mockClose).toHaveBeenCalled();
  });

  test("zip failure still closes db (finally block)", async () => {
    mockGenerateAsync.mockRejectedValueOnce(new Error("ZIP failed"));
    const { generateApkg } = await importBuilder();

    await expect(
      generateApkg({ deckName: "Test", cards: makeCards(1) }),
    ).rejects.toThrow("ZIP failed");

    expect(mockClose).toHaveBeenCalled();
  });
});
