/**
 * Anki .apkg SQLite schema (schema version 11).
 *
 * The .apkg format is a ZIP archive containing:
 * - collection.anki2: SQLite database with this schema
 * - media: JSON object mapping numeric indices to filenames (empty for no media)
 */

/** DDL statements for the Anki collection database. */
export const APKG_SCHEMA = `
CREATE TABLE IF NOT EXISTS col (
  id              integer primary key,
  crt             integer not null,
  mod             integer not null,
  scm             integer not null,
  ver             integer not null,
  dty             integer not null,
  usn             integer not null,
  ls              integer not null,
  conf            text not null,
  models          text not null,
  decks           text not null,
  dconf           text not null,
  tags            text not null
);

CREATE TABLE IF NOT EXISTS notes (
  id              integer primary key,
  guid            text not null,
  mid             integer not null,
  mod             integer not null,
  usn             integer not null,
  tags            text not null,
  flds            text not null,
  sfld            text not null,
  csum            integer not null,
  flags           integer not null,
  data            text not null
);

CREATE TABLE IF NOT EXISTS cards (
  id              integer primary key,
  nid             integer not null,
  did             integer not null,
  ord             integer not null,
  mod             integer not null,
  usn             integer not null,
  type            integer not null,
  queue           integer not null,
  due             integer not null,
  ivl             integer not null,
  factor          integer not null,
  reps            integer not null,
  lapses          integer not null,
  left            integer not null,
  odue            integer not null,
  odid            integer not null,
  flags           integer not null,
  data            text not null
);

CREATE TABLE IF NOT EXISTS revlog (
  id              integer primary key,
  cid             integer not null,
  usn             integer not null,
  ease            integer not null,
  ivl             integer not null,
  lastIvl         integer not null,
  factor          integer not null,
  time            integer not null,
  type            integer not null
);

CREATE TABLE IF NOT EXISTS graves (
  usn             integer not null,
  oid             integer not null,
  type            integer not null
);
`;

/** Characters used for Anki GUID generation. */
const GUID_CHARS = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ!#$%&()*+,-./:;<=>?@[]^_`{|}~';

/** Generate a 10-character GUID in Anki's format. */
export function generateGuid(): string {
  let guid = '';
  for (let i = 0; i < 10; i++) {
    guid += GUID_CHARS[Math.floor(Math.random() * GUID_CHARS.length)];
  }
  return guid;
}

/**
 * Compute a simple checksum of the sort field (first field).
 * Anki uses the first 8 digits of SHA1, but a simpler hash
 * suffices for generation — Anki recalculates on import.
 */
export function fieldChecksum(text: string): number {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return Math.abs(hash);
}

/**
 * Monotonic ID generator.
 * Guarantees strictly increasing IDs: uses current timestamp when the clock
 * has advanced, otherwise increments the last ID by 1. Safe across module
 * reloads (Date.now() ~1.7 trillion always exceeds a reset lastId of 0).
 */
let lastId = 0;
export function generateId(): number {
  const now = Date.now();
  lastId = now > lastId ? now : lastId + 1;
  return lastId;
}

export interface ColRowOptions {
  deckName: string;
  deckId: number;
  modelId: number;
}

/**
 * Build the single `col` row for the Anki collection.
 * Schema version 11 is the most broadly compatible.
 */
export function buildColRow(options: ColRowOptions): {
  id: number;
  crt: number;
  mod: number;
  scm: number;
  ver: number;
  dty: number;
  usn: number;
  ls: number;
  conf: string;
  models: string;
  decks: string;
  dconf: string;
  tags: string;
} {
  const { deckName, deckId, modelId } = options;
  const now = Math.floor(Date.now() / 1000);
  const nowMs = Date.now();

  const conf = JSON.stringify({
    activeDecks: [deckId],
    curDeck: deckId,
    newSpread: 0,
    collapseTime: 1200,
    timeLim: 0,
    estTimes: true,
    dueCounts: true,
    curModel: modelId,
    nextPos: 1,
    sortType: 'noteFld',
    sortBackwards: false,
    addToCur: true,
  });

  const models = JSON.stringify({
    [modelId]: {
      id: modelId,
      name: 'Basic',
      type: 0,
      mod: now,
      usn: -1,
      sortf: 0,
      did: deckId,
      tmpls: [
        {
          name: 'Card 1',
          ord: 0,
          qfmt: '{{Front}}',
          afmt: '{{FrontSide}}<hr id=answer>{{Back}}',
          bqfmt: '',
          bafmt: '',
          did: null,
          bfont: '',
          bsize: 0,
        },
      ],
      flds: [
        {
          name: 'Front',
          ord: 0,
          sticky: false,
          rtl: false,
          font: 'Arial',
          size: 20,
          media: [],
        },
        {
          name: 'Back',
          ord: 1,
          sticky: false,
          rtl: false,
          font: 'Arial',
          size: 20,
          media: [],
        },
      ],
      css: '.card {\n font-family: arial;\n font-size: 20px;\n text-align: center;\n color: black;\n background-color: white;\n}\n',
      latexPre: '\\documentclass[12pt]{article}\n\\special{papersize=3in,5in}\n\\usepackage{amssymb,amsmath}\n\\pagestyle{empty}\n\\setlength{\\parindent}{0in}\n\\begin{document}\n',
      latexPost: '\\end{document}',
      latexsvg: false,
      req: [[0, 'any', [0]]],
      vers: [],
      tags: [],
    },
  });

  const decks = JSON.stringify({
    [deckId]: {
      id: deckId,
      name: deckName,
      mod: now,
      usn: -1,
      lrnToday: [0, 0],
      revToday: [0, 0],
      newToday: [0, 0],
      timeToday: [0, 0],
      collapsed: false,
      browserCollapsed: false,
      desc: '',
      dyn: 0,
      conf: 1,
      extendNew: 10,
      extendRev: 50,
    },
  });

  const dconf = JSON.stringify({
    '1': {
      id: 1,
      name: 'Default',
      mod: 0,
      usn: 0,
      maxTaken: 60,
      autoplay: true,
      timer: 0,
      replayq: true,
      new: {
        bury: true,
        delays: [1, 10],
        initialFactor: 2500,
        ints: [1, 4, 7],
        order: 1,
        perDay: 20,
      },
      rev: {
        bury: true,
        ease4: 1.3,
        fuzz: 0.05,
        ivlFct: 1,
        maxIvl: 36500,
        perDay: 200,
        hardFactor: 1.2,
      },
      lapse: {
        delays: [10],
        leechAction: 0,
        leechFails: 8,
        minInt: 1,
        mult: 0,
      },
      dyn: false,
    },
  });

  return {
    id: 1,
    crt: now,
    mod: nowMs,
    scm: nowMs,
    ver: 11,
    dty: 0,
    usn: 0,
    ls: 0,
    conf,
    models,
    decks,
    dconf,
    tags: '{}',
  };
}
