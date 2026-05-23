export type Collection = {
  name: string;
  docCount: number | null;
  storageSize: number | null;
  avgObjSize: number | null;
  indexes: number | null;
};

export type SortBy = "name" | "docCount" | "storageSize";
export type SortDir = "asc" | "desc";
