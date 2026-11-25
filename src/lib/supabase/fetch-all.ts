/**
 * Supabase answers at most 1000 rows, whatever the limit says. Reads every page (four at a time)
 * up to `max`; the query needs a stable order. An error ends the reading with an exception, so an
 * export is never silently short.
 */
export const PAGE_ROWS = 1000;

export async function fetchAll<T>(page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>, max = 20_000): Promise<T[]> {
  const out: T[] = [];
  for (let start = 0; start < max; start += PAGE_ROWS * 4) {
    const starts = [0, 1, 2, 3].map((i) => start + i * PAGE_ROWS).filter((s) => s < max);
    // The first page alone answers most shops.
    const first = await page(starts[0]!, Math.min(starts[0]! + PAGE_ROWS, max) - 1);
    if (first.error) throw new Error(first.error.message);
    out.push(...(first.data ?? []));
    if ((first.data?.length ?? 0) < PAGE_ROWS) return out;
    const rest = await Promise.all(starts.slice(1).map((s) => page(s, Math.min(s + PAGE_ROWS, max) - 1)));
    for (const r of rest) {
      if (r.error) throw new Error(r.error.message);
      out.push(...(r.data ?? []));
    }
    if ((rest.at(-1)?.data?.length ?? 0) < PAGE_ROWS) return out;
  }
  return out;
}
