// Centralised MongoDB "mini documentation".
//
// One place to keep short, human-readable explanations of MongoDB concepts that
// we surface in the UI (e.g. index option popovers). Each entry has a short
// summary shown inline and a `docsUrl` linking to the official documentation for
// further reading. Update the `summary` / `docsUrl` here when MongoDB's docs change
// — no component edits needed.

export interface DocEntry {
  /** Short, human title shown as the popover heading. */
  title: string;
  /** 1–3 sentence plain-language explanation shown inline. */
  summary: string;
  /** Link to the official MongoDB docs page for the full details. */
  docsUrl: string;
}

/** Documentation for collection index options. Keyed by a stable slug. */
export const INDEX_OPTION_DOCS: Record<string, DocEntry> = {
  unique: {
    title: "Unique index",
    summary:
      "A unique index ensures that the indexed fields do not store duplicate values — a value appears at most once for a given field. A unique compound index ensures that any combination of the index key values appears at most once. MongoDB creates a unique index on the _id field automatically when a collection is created.",
    docsUrl: "https://www.mongodb.com/docs/manual/core/index-unique/",
  },
  sparse: {
    title: "Sparse index",
    summary:
      "A sparse index only contains entries for documents that have the indexed field, even if the field value is null. The index skips documents that do not include the field, so it can be smaller — but queries relying on it may not return documents that lack the field.",
    docsUrl: "https://www.mongodb.com/docs/manual/core/index-sparse/",
  },
  hidden: {
    title: "Hidden index",
    summary:
      "A hidden index is maintained by MongoDB but not used by the query planner. Hiding an index lets you evaluate the impact of dropping it without actually removing it — you can unhide it instantly if performance drops. The _id index cannot be hidden.",
    docsUrl: "https://www.mongodb.com/docs/manual/core/index-hidden/",
  },
  ttl: {
    title: "TTL index",
    summary:
      "A TTL (time to live) index automatically removes documents after a set number of seconds. MongoDB runs a background task that deletes expired documents based on the value of a date field. Useful for event logs, sessions and other data that should expire. Only single-field indexes on a date field support TTL.",
    docsUrl: "https://www.mongodb.com/docs/manual/core/index-ttl/",
  },
  partial: {
    title: "Partial index",
    summary:
      "A partial index only indexes the documents that match a filter expression. Because it indexes a subset of documents, it has lower storage and maintenance costs. A query can use a partial index only when the query is guaranteed to match the index's filter expression.",
    docsUrl: "https://www.mongodb.com/docs/manual/core/index-partial/",
  },
};
