import { Collection, Database, ServerStats, Document as MongoDocument } from "@/types";
import type { Connection } from "./types";
import { DocumentResponse } from "@/types/Document";

const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const res = await fetch(`/api${path}`, {
    headers: { "Content-Type": "application/json", ...init?.headers },
    ...init,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Request failed");
  return data as T;
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
        uri: conn.uri,
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
        `/mongo/${encodeURIComponent(db)}/${encodeURIComponent(collection)}/insert?uri=${encodeURIComponent(conn.uri)}`,
        { method: "POST", body: JSON.stringify(doc) },
      ),

    update: (
      conn: Connection,
      db: Database,
      collection: string,
      id: string,
      doc: Record<string, unknown>,
    ) =>
      request<{ matched: number; modified: number }>(
        `/mongo/${encodeURIComponent(db.name)}/${encodeURIComponent(collection)}/${encodeURIComponent(id)}?uri=${encodeURIComponent(conn.uri)}`,
        { method: "PUT", body: JSON.stringify(doc) },
      ),

    delete: (conn: Connection, db: Database, collection: string, id: string) =>
      request<{ deleted: number }>(
        `/mongo/${encodeURIComponent(db.name)}/${encodeURIComponent(collection)}/${encodeURIComponent(id)}?uri=${encodeURIComponent(conn.uri)}`,
        { method: "DELETE" },
      ),

    resolve: (conn: Connection, db: Database, id: string) =>
      request<{ doc: Record<string, unknown>; collection: string }>(
        `/mongo/${encodeURIComponent(db.name)}/resolve/${encodeURIComponent(id)}?uri=${encodeURIComponent(conn.uri)}`,
      ),

    indexes: (conn: Connection | null, db: Database | null, collection: Collection | null) =>
      request<{ indexes: IndexInfo[] }>(
        `/mongo/${encodeURIComponent(db!.name)}/${encodeURIComponent(collection!.name)}/indexes?uri=${encodeURIComponent(conn!.uri)}`,
      ),

    aggregate: (
      conn: Connection,
      db: Database,
      collection: Collection,
      pipeline: Record<string, unknown>[],
    ) =>
      request<{ results: MongoDocument[]; count: number }>(
        `/mongo/${encodeURIComponent(db.name)}/${encodeURIComponent(collection.name)}/aggregate?uri=${encodeURIComponent(conn.uri)}`,
        {
          method: 'POST',
          body: JSON.stringify({ pipeline }),
        },
      ),
  },

  stats: {
    server: (conn: Connection) =>
      request<ServerStats>(`/stats/server?uri=${encodeURIComponent(conn.uri)}`),

    databases: (conn: Connection) =>
      request<{ databases: Database[] }>(
        `/stats/databases?uri=${encodeURIComponent(conn.uri)}`,
      ),

    collections: (conn: Connection, db: string) =>
      request<{
        collections: Collection[];
      }>(
        `/stats/collections?uri=${encodeURIComponent(conn.uri)}&db=${encodeURIComponent(db)}`,
      ),
  },
};
