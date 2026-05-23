import { defineStore } from "pinia";
import { api } from "@/lib/api";
import { Connection, MongoConnection } from "@/lib/types";
import { useConnectionsStore } from "./connections";
import { Database } from "@/types";

export const useDatabaseStore = defineStore("database-store", {
  state: () => ({
    databaseList: new Map<string, Database[]>(),
    selectedDbList: new Map<string, Database>(),
    loaded: new Map<string, boolean>(),
  }),

  getters: {
    database:
      (state) =>
      (connection?: Connection | null): Database | null => {
        let conn: MongoConnection | null = connection ?? null;

        if (!conn) {
          const connectionStore = useConnectionsStore();
          conn = connectionStore.active;
        }

        if (!conn) return null;

        return state.selectedDbList.get(conn.id) ?? null;
      },
    databases:
      (state) =>
      (connection?: Connection | null): Database[] => {
        let conn: MongoConnection | null = connection ?? null;

        if (!conn) {
          const connectionStore = useConnectionsStore();
          conn = connectionStore.active;
        }

        if (!conn) return [];

        return state.databaseList.get(conn.id) ?? [];
      },
  },

  actions: {
    setDatabase(connection?: Connection, database?: Database) {
      let conn: MongoConnection | null = connection ?? null;

      if (!conn) {
        const connectionStore = useConnectionsStore();
        conn = connectionStore.active;
      }

      if (!conn) return;
      if (!database) return;

      this.selectedDbList.set(conn.id, database);
    },
    async loadDatabases(connection?: Connection | null, forceReload = false) {
      let conn: MongoConnection | null = connection ?? null;

      if (!conn) {
        const connectionStore = useConnectionsStore();
        conn = connectionStore.active;
      }

      if (!conn) return;

      if (this.loaded.has(conn.id) && !forceReload) return this.databases();

      const databases = await api.stats.databases(conn);

      this.databaseList.set(conn.id, databases.databases);
      this.loaded.set(conn.id, true);
    },
  },
});
