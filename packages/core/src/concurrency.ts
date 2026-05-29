/**
 * Map over `items` with at most `limit` concurrent workers, preserving input
 * order in the result. Used by adapters to fetch multiple collections in
 * parallel without reordering the documents they return.
 */
export async function mapWithConcurrency<T, U>(
  items: readonly T[],
  limit: number,
  mapper: (item: T, index: number) => Promise<U>,
): Promise<U[]> {
  const results = new Array<U>(items.length);
  const workerCount = Math.max(1, Math.min(Math.floor(limit), items.length));
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await mapper(items[index] as T, index);
    }
  }

  await Promise.all(Array.from({ length: workerCount }, () => worker()));

  return results;
}
