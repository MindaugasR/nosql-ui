import { Collection, Database, ServerStats, Document as MongoDocument } from "@/types";
import type { Connection } from "./types";
import { DocumentResponse } from "@/types/Document";

const TOKEN_HEADER = "x-connection-token";

// Session tokens per connection id. The raw URI travels once over POST
// /connections/connect — every other request carries only this opaque token.
const tokens = new Map<string, string>();
const inflightConnects = new Map<string, Promise<string>>();

const connect = (conn: Connection): Promise<string> => {
  const pending = inflightConnects.get(conn.id);
  if (pending) return pending;

  const promise = (async () => {
    const res = await fetch("/api/connections/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: conn.type, uri: conn.uri }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Connection failed");
    tokens.set(conn.id, data.token);
    return data.token as string;
  })().finally(() => inflightConnects.delete(conn.id));

  inflightConnects.set(conn.id, promise);
  return promise;
};

const request = async <T>(
  path: string,
  init?: RequestInit,
  conn?: Connection | null,
): Promise<T> => {
  const doFetch = async (token?: string) => {
    // Only send a JSON content-type when there's actually a body — otherwise
    // Fastify rejects bodyless requests (e.g. DELETE) with FST_ERR_CTP_EMPTY_JSON_BODY.
    const headers = new Headers(init?.headers);
    if (init?.body != null && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
    if (token) headers.set(TOKEN_HEADER, token);
    return fetch(`/api${path}`, { ...init, headers });
  };

  let token = conn ? (tokens.get(conn.id) ?? (await connect(conn))) : undefined;
  let res = await doFetch(token);
  let data = await res.json();

  // Token expired (e.g. server restart) — reconnect once and retry
  if (res.status === 401 && data.code === "INVALID_CONNECTION_TOKEN" && conn) {
    tokens.delete(conn.id);
    token = await connect(conn);
    res = await doFetch(token);
    data = await res.json();
  }

  if (!res.ok) throw new Error(data.error ?? "Request failed");
  return data as T;
};

export type QueryResponse = {
  type: "documents" | "value";
  documents?: MongoDocument[];
  value?: unknown;
  count?: number;
  executionMs: number;
};

export type IndexInfo = {
  key: Record<string, number | string>;
  name: string;
  unique?: boolean;
  sparse?: boolean;
  expireAfterSeconds?: number;
  hidden?: boolean;
  partialFilterExpression?: Record<string, unknown>;
  usageOps?: number;
  usageSince?: string;
  sizeKb?: number;
};

export const api = {
  envConnections: () =>
    request<{
      connections: Array<{ type: string; label: string; uri: string }>;
    }>("/env-connections"),

  testConnection: (body: Record<string, unknown>) =>
    request<{ ok: boolean }>("/connections/test", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  disconnect: (conn: Connection) => {
    const token = tokens.get(conn.id);
    tokens.delete(conn.id);
    if (!token) return Promise.resolve({ ok: true });
    return request<{ ok: boolean }>("/connections/disconnect", {
      method: "POST",
      headers: { [TOKEN_HEADER]: token },
    });
  },

  data: {
    find: (
      conn: Connection,
      db: Database,
      collection: Collection,
      params?: Partial<{
        filter: Record<string, unknown>;
        sort: [string, 1 | -1][];
        skip: number;
        limit: number;
      }>,
    ) => {
      const query = new URLSearchParams({
        skip: params?.skip ? String(params.skip) : "0",
        limit: params?.limit ? String(params?.limit) : "20",
      });

      const res = request<DocumentResponse>(
        `/mongo/${encodeURIComponent(db.name)}/${encodeURIComponent(collection.name)}/find?${query}`,
        {
          method: "POST",
          body: JSON.stringify({
            filter: params?.filter ?? {},
            sort: params?.sort ?? [],
          }),
        },
        conn,
      );

      return res;
    },

    insert: (
      conn: Connection,
      db: string,
      collection: string,
      doc: Record<string, unknown>,
    ) =>
      request<{ insertedId: string }>(
        `/mongo/${encodeURIComponent(db)}/${encodeURIComponent(collection)}/insert`,
        { method: "POST", body: JSON.stringify(doc) },
        conn,
      ),

    insertMany: (
      conn: Connection,
      db: string,
      collection: string,
      documents: Record<string, unknown>[],
    ) =>
      request<{ insertedCount: number }>(
        `/mongo/${encodeURIComponent(db)}/${encodeURIComponent(collection)}/insertMany`,
        { method: "POST", body: JSON.stringify({ documents }) },
        conn,
      ),

    update: (
      conn: Connection,
      db: Database,
      collection: string,
      id: string,
      doc: Record<string, unknown>,
    ) =>
      request<{ matched: number; modified: number }>(
        `/mongo/${encodeURIComponent(db.name)}/${encodeURIComponent(collection)}/${encodeURIComponent(id)}`,
        { method: "PUT", body: JSON.stringify(doc) },
        conn,
      ),

    delete: (conn: Connection, db: Database, collection: string, id: string) =>
      request<{ deleted: number }>(
        `/mongo/${encodeURIComponent(db.name)}/${encodeURIComponent(collection)}/${encodeURIComponent(id)}`,
        { method: "DELETE" },
        conn,
      ),

    resolve: (conn: Connection, db: Database, id: string) =>
      request<{ doc: Record<string, unknown>; collection: string }>(
        `/mongo/${encodeURIComponent(db.name)}/resolve/${encodeURIComponent(id)}`,
        undefined,
        conn,
      ),

    indexes: (conn: Connection | null, db: Database | null, collection: Collection | null) =>
      request<{ indexes: IndexInfo[] }>(
        `/mongo/${encodeURIComponent(db!.name)}/${encodeURIComponent(collection!.name)}/indexes`,
        undefined,
        conn,
      ),

    createIndex: (
      conn: Connection,
      db: Database,
      collection: Collection,
      body: {
        keys: Record<string, 1 | -1 | "text" | "2dsphere">;
        options?: {
          name?: string;
          unique?: boolean;
          sparse?: boolean;
          hidden?: boolean;
          expireAfterSeconds?: number;
          partialFilterExpression?: Record<string, unknown>;
        };
      },
    ) =>
      request<{ name: string }>(
        `/mongo/${encodeURIComponent(db.name)}/${encodeURIComponent(collection.name)}/indexes`,
        { method: "POST", body: JSON.stringify(body) },
        conn,
      ),

    dropIndex: (
      conn: Connection,
      db: Database,
      collection: Collection,
      name: string,
    ) =>
      request<{ dropped: string }>(
        `/mongo/${encodeURIComponent(db.name)}/${encodeURIComponent(collection.name)}/indexes/${encodeURIComponent(name)}`,
        { method: "DELETE" },
        conn,
      ),

    query: (
      conn: Connection,
      db: Database,
      body: {
        collection: string;
        method: string;
        args: unknown[];
        chain: { method: string; args: unknown[] }[];
      },
    ) =>
      request<QueryResponse>(
        `/mongo/${encodeURIComponent(db.name)}/query`,
        { method: "POST", body: JSON.stringify(body) },
        conn,
      ),

    aggregate: (
      conn: Connection,
      db: Database,
      collection: Collection,
      pipeline: Record<string, unknown>[],
    ) =>
      request<{ results: MongoDocument[]; count: number }>(
        `/mongo/${encodeURIComponent(db.name)}/${encodeURIComponent(collection.name)}/aggregate`,
        {
          method: "POST",
          body: JSON.stringify({ pipeline }),
        },
        conn,
      ),
  },

  stats: {
    server: (conn: Connection) =>
      request<ServerStats>("/stats/server", undefined, conn),

    databases: (conn: Connection) =>
      request<{ databases: Database[] }>("/stats/databases", undefined, conn),

    collections: (conn: Connection, db: string) =>
      request<{
        collections: Collection[];
      }>(`/stats/collections?db=${encodeURIComponent(db)}`, undefined, conn),
  },
};
