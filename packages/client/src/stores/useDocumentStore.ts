import { Connection, MongoConnection } from "@/lib/types";
import { api } from "@/lib/api";
import { Collection, Database, Document, StackEntry } from "@/types";
import { defineStore } from "pinia";
import { useConnectionsStore } from "./connections";
import { useDatabaseStore } from "./useDatabaseStore";
import { useCollectionStore } from "./useCollectionStore";

export const useDocumentStore = defineStore("document-store", {
  state: () => ({
    DEFAULT_PAGINATION: {
      skip: 0,
      limit: 20,
    },
    totalList: new Map<string, number>(),
    documentList: new Map<string, Document[] | null>(),
    pagination: new Map<string, { skip: number; limit: number }>(),
    filterList: new Map<string, Record<string, unknown>>(),
    filterStringList: new Map<string, string>(),
    fieldTypesList: new Map<string, Record<string, string>>(),
    loaded: new Map<string, boolean>(),
    openedDocumentList: new Map<string, StackEntry[]>(),
    selectedDocumentList: new Map<string, Document>(),
  }),

  getters: {
    __key: () => {
      const connectionStore = useConnectionsStore();
      const databaseStore = useDatabaseStore();
      const connection = connectionStore.active;
      return `${connection?.id}:${databaseStore.database()?.name}`;
    },
    selectedDocument(state) {
      return (connId?: Connection | null) => {
        let conn: MongoConnection | null = connId ?? null;
        if (!conn) {
          const connectionStore = useConnectionsStore();
          conn = connectionStore.active;
        }
        if (!conn) return null;
        return state.selectedDocumentList.get(this.__key) ?? null;
      };
    },
    openedDocument(state) {
      return (connId?: Connection | null) => {
        let conn: MongoConnection | null = connId ?? null;
        if (!conn) {
          const connectionStore = useConnectionsStore();
          conn = connectionStore.active;
        }
        if (!conn) return null;
        return state.openedDocumentList.get(this.__key) ?? [];
      };
    },
    documents(state) {
      return (connId?: Connection | null) => {
        let conn: MongoConnection | null = connId ?? null;
        if (!conn) {
          const connectionStore = useConnectionsStore();
          conn = connectionStore.active;
        }
        if (!conn) return [];
        return state.documentList.get(this.__key) ?? [];
      };
    },
    total(state) {
      return (connId?: Connection | null) => {
        let conn: MongoConnection | null = connId ?? null;
        if (!conn) {
          const connectionStore = useConnectionsStore();
          conn = connectionStore.active;
        }
        if (!conn) return 0;
        return state.totalList.get(this.__key) ?? 0;
      };
    },
    fieldTypes(state) {
      return () => state.fieldTypesList.get(this.__key) ?? {};
    },
    filterString(state) {
      return () => state.filterStringList.get(this.__key) ?? "{}";
    },
  },

  actions: {
    setFilterString(raw: string) {
      this.filterStringList.set(this.__key, raw);
    },

    async clearFilter() {
      const pagination = this.pagination.get(this.__key);
      const limit = pagination?.limit ?? this.DEFAULT_PAGINATION.limit;
      this.filterStringList.set(this.__key, "{}");
      this.filterList.delete(this.__key);
      await this.fetchDocuments(undefined, { filter: {}, skip: 0, limit });
    },

    unselectDocument(connection?: Connection) {
      let conn: MongoConnection | null = connection ?? null;
      if (!conn) {
        const connectionStore = useConnectionsStore();
        conn = connectionStore.active;
      }
      if (!conn) return null;
      this.selectedDocumentList.delete(this.__key);
    },
    openDocument(stack: StackEntry[], connection?: Connection) {
      let conn: MongoConnection | null = connection ?? null;
      if (!conn) {
        const connectionStore = useConnectionsStore();
        conn = connectionStore.active;
      }
      if (!conn) return null;
      if (stack.length > 0) {
        const first = stack[0];
        this.selectedDocumentList.set(this.__key, first.doc);
      }
      this.openedDocumentList.set(this.__key, stack);
    },
    async fetchDocuments(
      params?: Partial<{
        connection: Connection;
        db: Database;
        collection: Collection;
      }>,
      args?: Partial<{
        limit: number;
        skip: number;
        filter: Record<string, unknown>;
      }>,
    ) {
      const databaseStore = useDatabaseStore();
      const collectionStore = useCollectionStore();

      let conn: MongoConnection | null = params?.connection ?? null;
      let database: Database | null = params?.db ?? null;
      let collection: Collection | null = params?.collection ?? null;

      if (!conn) {
        const connectionStore = useConnectionsStore();
        conn = connectionStore.active;
      }
      if (!database) database = databaseStore.database();
      if (!collection) collection = collectionStore.collection();

      if (!conn) return null;
      if (!database) return null;
      if (!collection) return null;

      if (args?.filter !== undefined) {
        this.filterList.set(this.__key, args.filter);
      }
      const activeFilter = this.filterList.get(this.__key) ?? {};

      const res = await api.data.find(conn, database, collection, {
        ...args,
        filter: activeFilter,
      });

      this.pagination.set(this.__key, {
        skip: res.skip ?? this.DEFAULT_PAGINATION.skip,
        limit: res.limit ?? this.DEFAULT_PAGINATION.limit,
      });

      this.documentList.set(this.__key, res.documents ?? null);
      this.totalList.set(this.__key, res.total ?? 0);
      if (res.fieldTypes && Object.keys(res.fieldTypes).length > 0) {
        this.fieldTypesList.set(this.__key, res.fieldTypes);
      }
    },
  },
});
