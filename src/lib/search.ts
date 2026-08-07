export function matchesPersonSearch(
  query: string,
  fields: Array<string | number | boolean | null | undefined>
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = fields
    .filter((v) => v !== null && v !== undefined && v !== '')
    .map((v) => String(v).toLowerCase())
    .join(' ');
  return q.split(/\s+/).every((part) => haystack.includes(part));
}
