// Query Editor history & favorites, persisted in localStorage.

export interface HistoryEntry {
  query: string;
  db: string;
  ts: number;
}

export interface FavoriteEntry extends HistoryEntry {
  id: string;
  name: string;
}

const HISTORY_KEY = "nosql-manager-query-history";
const FAVORITES_KEY = "nosql-manager-query-favorites";
const HISTORY_LIMIT = 50;

const load = <T>(key: string): T[] => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
};

export const loadHistory = (): HistoryEntry[] => load<HistoryEntry>(HISTORY_KEY);

export const pushHistory = (entry: Omit<HistoryEntry, "ts">): HistoryEntry[] => {
  const history = loadHistory().filter(
    (h) => !(h.query === entry.query && h.db === entry.db),
  );
  history.unshift({ ...entry, ts: Date.now() });
  const trimmed = history.slice(0, HISTORY_LIMIT);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed));
  return trimmed;
};

export const clearHistory = (): HistoryEntry[] => {
  localStorage.removeItem(HISTORY_KEY);
  return [];
};

export const loadFavorites = (): FavoriteEntry[] =>
  load<FavoriteEntry>(FAVORITES_KEY);

const saveFavorites = (favorites: FavoriteEntry[]): FavoriteEntry[] => {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
  return favorites;
};

export const addFavorite = (
  entry: Omit<FavoriteEntry, "id" | "ts">,
): FavoriteEntry[] =>
  saveFavorites([
    { ...entry, id: crypto.randomUUID(), ts: Date.now() },
    ...loadFavorites(),
  ]);

export const removeFavorite = (id: string): FavoriteEntry[] =>
  saveFavorites(loadFavorites().filter((f) => f.id !== id));

export const renameFavorite = (id: string, name: string): FavoriteEntry[] =>
  saveFavorites(
    loadFavorites().map((f) => (f.id === id ? { ...f, name } : f)),
  );
