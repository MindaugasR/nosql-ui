import { Connection, MongoConnection } from "@/lib/types";
import { defineStore } from "pinia";
import { api } from "@/lib/api";
import { useConnectionsStore } from "./connections";
import { Collection, Database, SortBy, SortDir, StackEntry } from "@/types";
import { useDatabaseStore } from "./useDatabaseStore";

// ─── Types ────────────────────────────────────────────────────────────────────

export type BrowserState = {
  collection: string;
  documents: Record<string, unknown>[];
  total: number;
  skip: number;
  filterInput: string;
  docStack: StackEntry[];
  editorOpen: boolean;
};

export type ConnState = {
  selectedDb: string | null;
  databases: string[];
  collections: Collection[];
  selectedCollection: string | null;
  browser: BrowserState | null;
};

// ─── Store ────────────────────────────────────────────────────────────────────

export const useCollectionStore = defineStore("collection-store", {
  state: () => ({
    collectionList: new Map<string, Collection[]>(),
    selectedCollectionList: new Map<string, Collection>(),
    sortList: new Map<string, { sortBy: SortBy; sortDir: SortDir }>(),
    loaded: new Map<string, boolean>(),
    byConn: {} as Record<string, ConnState>,
  }),

  getters: {
    __key: () => {
      const connectionStore = useConnectionsStore();
      const databaseStore = useDatabaseStore();

      const connection = connectionStore.active;

      return `${connection?.id}:${databaseStore.database()?.name}`;
    },
    sort(state) {
      return (connId?: Connection | null) => {
        let conn: MongoConnection | null = connId ?? null;

        if (!conn) {
          const connectionStore = useConnectionsStore();
          conn = connectionStore.active;
        }

        if (!conn) return { sortBy: "name", sortDir: "asc" };

        return (
          state.sortList.get(this.__key) ?? { sortBy: "name", sortDir: "asc" }
        );
      };
    },
    collections(state) {
      return (connId?: Connection | null) => {
        let conn: MongoConnection | null = connId ?? null;

        if (!conn) {
          const connectionStore = useConnectionsStore();
          conn = connectionStore.active;
        }

        if (!conn) return [];

        return state.collectionList.get(this.__key) ?? [];
      };
    },
    collection(state) {
      return (connId?: Connection | null) => {
        let conn: MongoConnection | null = connId ?? null;

        if (!conn) {
          const connectionStore = useConnectionsStore();
          conn = connectionStore.active;
        }

        if (!conn) return null;

        return state.selectedCollectionList.get(this.__key) ?? null;
      };
    },
    get:
      (state) =>
      (connId: string): ConnState =>
        state.byConn[connId] ?? {
          selectedDb: null,
          databases: [],
          collections: [],
          selectedCollection: null,
          browser: null,
        },

    getBrowser:
      (state) =>
      (connId: string): BrowserState | null =>
        state.byConn[connId]?.browser ?? null,
  },

  actions: {
    _init(connId: string) {
      if (!this.byConn[connId]) {
        this.byConn[connId] = {
          selectedDb: null,
          databases: [],
          collections: [],
          selectedCollection: null,
          browser: null,
        };
      }
    },

    setSelectedDb(connId: string, db: string | null) {
      this._init(connId);
      this.byConn[connId].selectedDb = db;
      this.byConn[connId].collections = [];
      this.byConn[connId].selectedCollection = null;
      this.byConn[connId].browser = null;
    },

    setDatabases(connId: string, list: string[]) {
      this._init(connId);
      this.byConn[connId].databases = list;
    },

    setCollections(connId: string, list: Collection[]) {
      this._init(connId);
      this.byConn[connId].collections = [...list].sort((a, b) =>
        a.name.localeCompare(b.name),
      );
    },

    selectCollection(name: string, connId?: Connection | null) {
      let conn: MongoConnection | null = connId ?? null;

      if (!conn) {
        const connectionStore = useConnectionsStore();
        conn = connectionStore.active;
      }

      if (!conn) return false;

      const collection = this.collectionList
        .get(this.__key)
        ?.find((col) => col.name === name);
      if (!collection) return false;

      this.selectedCollectionList.set(this.__key, collection);
    },

    setBrowser(connId: string, browser: BrowserState) {
      this._init(connId);
      this.byConn[connId].browser = browser;
    },

    setSort(
      connection: Connection | null,
      sort: { sortBy: SortBy; sortDir: SortDir },
    ) {
      let conn: MongoConnection | null = connection ?? null;

      if (!conn) {
        const connectionStore = useConnectionsStore();
        conn = connectionStore.active;
      }

      if (!conn) return null;

      this.sortList.set(this.__key, {
        sortBy: sort.sortBy,
        sortDir: sort.sortDir,
      });
    },

    // Fetch only when this connection+db hasn't been loaded yet — otherwise
    // reuse what's already in the store (e.g. loaded by the Collections page)
    async ensureCollections(connection: Connection, database?: Database) {
      const databaseStore = useDatabaseStore();
      const db = database ?? databaseStore.database();
      if (!connection || !db) return;
      if (this.loaded.get(this.__key)) return;
      await this.fetchCollections(connection, db);
    },

    async fetchCollections(connection: Connection, database?: Database) {
      const databaseStore = useDatabaseStore();

      let conn: MongoConnection | null = connection ?? null;
      let db: Database | null | undefined = database;

      if (!conn) {
        const connectionStore = useConnectionsStore();
        conn = connectionStore.active;
      }

      if (!db) db = databaseStore.database();

      if (!conn) return null;
      if (!db) return null;

      const res = await api.stats.collections(conn, db.name);

      this.collectionList.set(this.__key, res.collections);
      this.loaded.set(this.__key, true);
    },
  },
});
