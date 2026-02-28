/**
 * APKG file generator using sql.js (in-memory SQLite) + JSZip.
 *
 * Generates valid .apkg files that can be imported into Anki desktop/mobile.
 * Runs client-side in the browser using the WASM build of sql.js.
 *
 * The WASM binary (sql-wasm.wasm) is served from the public/ directory.
 */

import initSqlJs from "sql.js";
import JSZip from "jszip";
import {
  APKG_SCHEMA,
  buildColRow,
  generateGuid,
  fieldChecksum,
  generateId,
} from "./schema";

/**
 * Maximum cards per APKG export.
 * 2000 cards = ~4000 SQL inserts — completes in <2s on low-end devices.
 */
const MAX_APKG_CARDS = 2000;

export interface ApkgCard {
  front: string;
  back: string;
  tags?: string[];
}

export interface ApkgOptions {
  deckName: string;
  cards: ApkgCard[];
  /** Called with progress fraction (0–1) during card insertion. */
  onProgress?: (fraction: number) => void;
  /** Signal to abort the export. Checked between batches. */
  signal?: AbortSignal;
}

export interface ApkgResult {
  data: ArrayBuffer;
  cardCount: number;
  deckName: string;
}

/** Generate an .apkg file from a deck name and array of cards. */
export async function generateApkg(options: ApkgOptions): Promise<ApkgResult> {
  const { deckName, cards } = options;

  if (cards.length === 0) {
    throw new Error("At least one card is required");
  }

  if (cards.length > MAX_APKG_CARDS) {
    throw new Error(
      `Export is limited to ${MAX_APKG_CARDS} cards per file. You selected ${cards.length}. Please reduce your selection.`,
    );
  }

  // Initialize sql.js with browser WASM loading.
  // Uses Vite's BASE_URL so it works under subpath deploys (defaults to "/").
  let SQL: Awaited<ReturnType<typeof initSqlJs>>;
  try {
    SQL = await initSqlJs({
      locateFile: (file: string) => `${import.meta.env.BASE_URL}${file}`,
    });
  } catch (err) {
    throw new Error(
      "Failed to load the APKG export engine. Please reload the page and try again.",
      { cause: err },
    );
  }

  const db = new SQL.Database();

  try {
    // Create schema
    db.run(APKG_SCHEMA);

    const deckId = generateId();
    const modelId = generateId();

    // Insert col row
    const col = buildColRow({ deckName, deckId, modelId });
    db.run(
      `INSERT INTO col VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        col.id,
        col.crt,
        col.mod,
        col.scm,
        col.ver,
        col.dty,
        col.usn,
        col.ls,
        col.conf,
        col.models,
        col.decks,
        col.dconf,
        col.tags,
      ],
    );

    // Insert notes and cards in batches, yielding to the UI thread between batches.
    const now = Math.floor(Date.now() / 1000);
    const BATCH_SIZE = 100;

    for (let i = 0; i < cards.length; i++) {
      const card = cards[i]!;
      const noteId = generateId();
      const cardId = generateId();
      const guid = generateGuid();
      const flds = `${card.front}\x1f${card.back}`;
      const tags = card.tags ? ` ${card.tags.join(" ")} ` : "";
      const csum = fieldChecksum(card.front);

      db.run(
        `INSERT INTO notes VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          noteId,     // id
          guid,       // guid
          modelId,    // mid
          now,        // mod
          -1,         // usn
          tags,       // tags
          flds,       // flds (fields separated by \x1f)
          card.front, // sfld (sort field)
          csum,       // csum
          0,          // flags
          "",         // data
        ],
      );

      db.run(
        `INSERT INTO cards VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          cardId,  // id
          noteId,  // nid
          deckId,  // did
          0,       // ord (card template ordinal)
          now,     // mod
          -1,      // usn
          0,       // type (0=new)
          0,       // queue (0=new)
          i,       // due (position in new card queue)
          0,       // ivl
          0,       // factor
          0,       // reps
          0,       // lapses
          0,       // left
          0,       // odue
          0,       // odid
          0,       // flags
          "",      // data
        ],
      );

      // Yield every BATCH_SIZE cards to prevent UI freeze
      if ((i + 1) % BATCH_SIZE === 0 && i + 1 < cards.length) {
        options.onProgress?.((i + 1) / cards.length);
        if (options.signal?.aborted) {
          throw new Error("Export was cancelled");
        }
        await new Promise<void>((resolve) => setTimeout(resolve, 0));
      }
    }

    options.onProgress?.(1);

    // Export database to binary
    const dbBinary = db.export();

    // Package into ZIP
    const zip = new JSZip();
    zip.file("collection.anki2", dbBinary);
    zip.file("media", "{}");

    const zipData = await zip.generateAsync({
      type: "arraybuffer",
      compression: "DEFLATE",
      compressionOptions: { level: 6 },
    });

    return {
      data: zipData,
      cardCount: cards.length,
      deckName,
    };
  } finally {
    db.close();
  }
}
