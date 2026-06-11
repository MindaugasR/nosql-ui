import { defineStore } from "pinia";
import type { Connection, NewConnection } from "../lib/types";
import { api } from "../lib/api";

const STORAGE_KEY = "nosql-manager-connections";
const OPEN_KEY = "nosql-manager-open";
const CURRENT_KEY = "nosql-manager-current";

const fromStorage = <T>(
  key: string,
  fallback: T,
  storage: Storage = localStorage,
): T => {
  try {
    const raw = storage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

export const useConnectionsStore = defineStore("connections", {
  state: () => ({
    connections: fromStorage<Connection[]>(STORAGE_KEY, []),
    openConnections: fromStorage<Connection[]>(OPEN_KEY, [], sessionStorage),
    currentId: sessionStorage.getItem(CURRENT_KEY) as string | null,
  }),
  getters: {
    active: (state): Connection | null =>
      state.openConnections.find((c) => c.id === state.currentId) ?? null,
  },
  actions: {
    saveConnections() {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.connections));
    },
    saveOpen() {
      sessionStorage.setItem(OPEN_KEY, JSON.stringify(this.openConnections));
    },
    addConnection(conn: NewConnection) {
      this.connections.push({ ...conn, id: crypto.randomUUID() } as Connection);
      this.saveConnections();
    },
    removeConnection(id: string) {
      this.connections = this.connections.filter((c) => c.id !== id);
      this.saveConnections();
      if (this.currentId === id) this.closeConnection(id);
    },
    updateConnection(id: string, data: Partial<Omit<Connection, "id">>) {
      this.connections = this.connections.map((c) =>
        c.id === id ? { ...c, ...data } : c,
      );
      this.saveConnections();
      this.openConnections = this.openConnections.map((c) =>
        c.id === id ? { ...c, ...data } : c,
      );
      this.saveOpen();
    },
    openConnection(conn: Connection) {
      if (!this.openConnections.find((c) => c.id === conn.id)) {
        this.openConnections = [...this.openConnections, conn];
        this.saveOpen();
      }
      this.currentId = conn.id;
      sessionStorage.setItem(CURRENT_KEY, conn.id);
    },
    closeConnection(id: string) {
      const conn = this.openConnections.find((c) => c.id === id);
      if (conn) api.disconnect(conn).catch(() => {}); // best-effort server cleanup
      this.openConnections = this.openConnections.filter((c) => c.id !== id);
      this.saveOpen();

      if (this.currentId === id) {
        const next = this.openConnections.at(-1) ?? null;
        this.currentId = next?.id ?? null;
        if (next) sessionStorage.setItem(CURRENT_KEY, next.id);
        else sessionStorage.removeItem(CURRENT_KEY);
      }
    },

    switchConnection(id: string) {
      this.currentId = id;
      sessionStorage.setItem("nosql-manager-current", id);
    },
    setActive(conn: Connection | null) {
      if (conn) this.openConnection(conn);
      else {
        this.openConnections = [];
        this.currentId = null;
        sessionStorage.removeItem(OPEN_KEY);
        sessionStorage.removeItem(CURRENT_KEY);
      }
    },
  },
});
