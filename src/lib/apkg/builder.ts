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

export interface ApkgCard {
  front: string;
  back: string;
  tags?: string[];
}

export interface ApkgOptions {
  deckName: string;
  cards: ApkgCard[];
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

  // Initialize sql.js with browser WASM loading.
  // locateFile tells sql.js where to find the .wasm binary.
  const SQL = await initSqlJs({
    locateFile: (file: string) => `/${file}`,
  });

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

    // Insert notes and cards
    const now = Math.floor(Date.now() / 1000);
    let duePosition = 0;

    for (const card of cards) {
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
          cardId,      // id
          noteId,      // nid
          deckId,      // did
          0,           // ord (card template ordinal)
          now,         // mod
          -1,          // usn
          0,           // type (0=new)
          0,           // queue (0=new)
          duePosition, // due (position in new card queue)
          0,           // ivl
          0,           // factor
          0,           // reps
          0,           // lapses
          0,           // left
          0,           // odue
          0,           // odid
          0,           // flags
          "",          // data
        ],
      );

      duePosition++;
    }

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
