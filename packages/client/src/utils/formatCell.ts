export const formatCell = (value: unknown): string => {
  if (value === null || value === undefined) return "—";
  if (typeof value === "object")
    return Array.isArray(value)
      ? `[ ${(value as unknown[]).length} ]`
      : "{ … }";
  if (typeof value === "string" && value.length > 60)
    return value.slice(0, 60) + "…";

  return String(value);
};
