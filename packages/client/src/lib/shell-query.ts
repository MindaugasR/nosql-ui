// Mongo shell query parser.
//
// Turns a mongosh-style string like
//   db.users.find({ status: 'active' }).sort({ createdAt: -1 }).limit(5)
// into a structured payload the server can execute against a method whitelist.
// No code is ever evaluated — arguments are parsed as relaxed JSON with the
// common BSON constructors (ObjectId, ISODate, new Date) converted to
// Extended JSON markers the server coerces back into real BSON values.

export interface ChainCall {
  method: string;
  args: unknown[];
}

export interface ParsedQuery {
  collection: string;
  method: string;
  args: unknown[];
  chain: ChainCall[];
  isWrite: boolean;
}

export class ShellParseError extends Error {}

export const WRITE_METHODS = new Set([
  "insertOne",
  "insertMany",
  "updateOne",
  "updateMany",
  "replaceOne",
  "deleteOne",
  "deleteMany",
  "drop",
]);

export const READ_METHODS = new Set([
  "find",
  "findOne",
  "aggregate",
  "countDocuments",
  "estimatedDocumentCount",
  "distinct",
]);

export const CHAIN_METHODS = new Set(["sort", "limit", "skip", "project"]);

// Accepted but ignored — common mongosh habits
const NOOP_CHAIN_METHODS = new Set(["toArray", "pretty"]);

// ── Relaxed JSON ─────────────────────────────────────────────────────────────

// Mongosh-style input → strict JSON: BSON constructors become Extended JSON
// markers, unquoted keys get quoted, single quotes become double quotes.
export const relaxedToJson = (text: string): string =>
  text
    .replace(
      /ObjectId\s*\(\s*["']([0-9a-fA-F]{24})["']\s*\)/g,
      '{"$oid":"$1"}',
    )
    .replace(
      /(?:new\s+Date|ISODate)\s*\(\s*["']([^"']*)["']\s*\)/g,
      '{"$date":"$1"}',
    )
    .replace(
      /(?:new\s+Date|ISODate)\s*\(\s*\)/g,
      () => `{"$date":"${new Date().toISOString()}"}`,
    )
    .replace(
      /([{,[]\s*)([$a-zA-Z_][$\w]*)(\s*:)/g,
      (_, pre, key, post) => `${pre}"${key}"${post}`,
    )
    .replace(/^\s*([$a-zA-Z_][$\w]*)(\s*:)/, (_, key, post) => `"${key}"${post}`)
    .replace(/'([^'\\]*)'/g, '"$1"')
    .replace(/,(\s*[}\]])/g, "$1");

const parseArg = (raw: string): unknown => {
  const text = raw.trim();
  if (!text) return undefined;
  try {
    return JSON.parse(relaxedToJson(text));
  } catch {
    throw new ShellParseError(
      `Cannot parse argument: ${text.length > 60 ? text.slice(0, 60) + "…" : text}`,
    );
  }
};

// ── Scanner ──────────────────────────────────────────────────────────────────

/** Split a parenthesised argument list into top-level arguments. */
const splitTopLevelArgs = (inner: string): string[] => {
  const args: string[] = [];
  let depth = 0;
  let inStr: string | null = null;
  let start = 0;
  for (let i = 0; i < inner.length; i++) {
    const ch = inner[i];
    if (inStr) {
      if (ch === "\\") i++;
      else if (ch === inStr) inStr = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") inStr = ch;
    else if (ch === "{" || ch === "[" || ch === "(") depth++;
    else if (ch === "}" || ch === "]" || ch === ")") depth--;
    else if (ch === "," && depth === 0) {
      args.push(inner.slice(start, i));
      start = i + 1;
    }
  }
  const last = inner.slice(start);
  if (last.trim() || args.length > 0) args.push(last);
  return args.filter((a) => a.trim() !== "");
};

/** Find the index of the `)` matching the `(` at `openIdx`. */
const matchParen = (src: string, openIdx: number): number => {
  let depth = 0;
  let inStr: string | null = null;
  for (let i = openIdx; i < src.length; i++) {
    const ch = src[i];
    if (inStr) {
      if (ch === "\\") i++;
      else if (ch === inStr) inStr = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") inStr = ch;
    else if (ch === "(") depth++;
    else if (ch === ")") {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
};

/** Quick collection-name extraction for autocomplete (no full parse). */
export const extractCollectionName = (input: string): string | null => {
  const m = input.match(
    /\bdb\s*(?:\.\s*([$\w]+)|\.getCollection\s*\(\s*["']([^"']+)["']\s*\)|\[\s*["']([^"']+)["']\s*\])/,
  );
  return m ? (m[1] ?? m[2] ?? m[3] ?? null) : null;
};

export const parseShellQuery = (input: string): ParsedQuery => {
  let src = input.trim().replace(/;+\s*$/, "");
  if (!src) throw new ShellParseError("Query is empty");

  // db prefix
  const dbMatch = src.match(/^db\s*/);
  if (!dbMatch) throw new ShellParseError('Query must start with "db."');
  src = src.slice(dbMatch[0].length);

  // collection: .name | .getCollection("name") | ["name"]
  let collection: string;
  let rest: string;
  let m: RegExpMatchArray | null;
  if ((m = src.match(/^\.\s*getCollection\s*\(\s*["']([^"']+)["']\s*\)/))) {
    collection = m[1];
    rest = src.slice(m[0].length);
  } else if ((m = src.match(/^\[\s*["']([^"']+)["']\s*\]/))) {
    collection = m[1];
    rest = src.slice(m[0].length);
  } else if ((m = src.match(/^\.\s*([$\w]+)/))) {
    collection = m[1];
    rest = src.slice(m[0].length);
  } else {
    throw new ShellParseError(
      'Expected a collection after "db." — e.g. db.users.find({})',
    );
  }

  // method chain: .method(args)...
  const calls: ChainCall[] = [];
  while (rest.trim()) {
    const callMatch = rest.match(/^\s*\.\s*([$\w]+)\s*/);
    if (!callMatch)
      throw new ShellParseError(
        `Unexpected input: ${rest.trim().slice(0, 40)}`,
      );
    const method = callMatch[1];
    rest = rest.slice(callMatch[0].length);
    if (rest[0] !== "(")
      throw new ShellParseError(`Expected "(" after .${method}`);
    const close = matchParen(rest, 0);
    if (close === -1)
      throw new ShellParseError(`Unbalanced parentheses in .${method}(...)`);
    const inner = rest.slice(1, close);
    rest = rest.slice(close + 1);
    calls.push({
      method,
      args: splitTopLevelArgs(inner).map(parseArg),
    });
  }

  if (calls.length === 0)
    throw new ShellParseError(
      "Expected a method call — e.g. db.users.find({})",
    );

  const [first, ...chainCalls] = calls;
  if (!READ_METHODS.has(first.method) && !WRITE_METHODS.has(first.method)) {
    throw new ShellParseError(
      `Unsupported method: ${first.method}. Supported: ${[...READ_METHODS, ...WRITE_METHODS].join(", ")}`,
    );
  }

  const chain: ChainCall[] = [];
  for (const c of chainCalls) {
    if (NOOP_CHAIN_METHODS.has(c.method)) continue;
    if (!CHAIN_METHODS.has(c.method))
      throw new ShellParseError(
        `Unsupported cursor method: .${c.method}(). Supported: ${[...CHAIN_METHODS].map((x) => `.${x}()`).join(", ")}`,
      );
    if (
      (c.method === "limit" || c.method === "skip") &&
      typeof c.args[0] !== "number"
    )
      throw new ShellParseError(`.${c.method}() expects a number`);
    chain.push(c);
  }

  return {
    collection,
    method: first.method,
    args: first.args,
    chain,
    isWrite: WRITE_METHODS.has(first.method),
  };
};
