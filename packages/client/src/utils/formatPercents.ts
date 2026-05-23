export const formatPercents = (used: number, total: number) => {
  if (!used || !total) return 0;

  return Math.round((used / total) * 100);
};
