import { Connection, MongoConnection } from "@/lib/types";
import { api } from "@/lib/api";
import { ServerStats } from "@/types";
import { defineStore } from "pinia";
import { useConnectionsStore } from "./connections";

export const useServerStore = defineStore("server-store", {
  state: () => ({
    severStatsList: new Map<string, ServerStats | null>(),
    statsErrorList: new Map<string, string>(),
    loaded: new Map<string, boolean>(),
  }),

  getters: {
    statsError:
      (state) =>
      (connection?: Connection | null): string | null => {
        let conn: MongoConnection | null = connection ?? null;

        if (!conn) {
          const connectionStore = useConnectionsStore();
          conn = connectionStore.active;
        }

        if (!conn) return null;

        return state.statsErrorList.get(conn.id) ?? null;
      },
    stats:
      (state) =>
      (connection?: Connection | null): ServerStats | null => {
        let conn: MongoConnection | null = connection ?? null;

        if (!conn) {
          const connectionStore = useConnectionsStore();
          conn = connectionStore.active;
        }

        if (!conn) return null;

        return state.severStatsList.get(conn.id) ?? null;
      },
  },

  actions: {
    async loadStats(connection?: Connection | null, forceReload = false) {
      let conn: MongoConnection | null = connection ?? null;

      if (!conn) {
        const connectionStore = useConnectionsStore();
        conn = connectionStore.active;
      }

      if (!conn) return;

      if (this.loaded.has(conn.id) && !forceReload) return this.stats();

      try {
        const stats = await api.stats.server(conn);

        this.severStatsList.set(conn.id, stats);
        this.loaded.set(conn.id, true);
      } catch (e) {
        this.statsErrorList.set(conn.id, (e as Error).message);
      }
    },
  },
});
