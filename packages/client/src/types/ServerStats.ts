export type ServerStats = {
  version: string | null;
  uptime: number | null;
  memory: { used: number; total: number } | null;
  connections: { current: number; available: number } | null;
  ops: {
    insert: number;
    query: number;
    update: number;
    delete: number;
  } | null;
};
