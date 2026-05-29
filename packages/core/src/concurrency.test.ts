import { mapWithConcurrency } from "@cms-lab/core";

test("mapWithConcurrency preserves input order regardless of completion order", async () => {
  const result = await mapWithConcurrency([30, 10, 20, 0], 2, async (ms, i) => {
    await new Promise((resolve) => setTimeout(resolve, ms));
    return `${i}:${ms}`;
  });

  expect(result).toEqual(["0:30", "1:10", "2:20", "3:0"]);
});

test("mapWithConcurrency never runs more than `limit` workers at once", async () => {
  let active = 0;
  let peak = 0;

  await mapWithConcurrency(
    Array.from({ length: 10 }, (_, i) => i),
    3,
    async () => {
      active += 1;
      peak = Math.max(peak, active);
      await new Promise((resolve) => setTimeout(resolve, 5));
      active -= 1;
    },
  );

  expect(peak).toBeLessThanOrEqual(3);
  expect(peak).toBeGreaterThan(1);
});

test("mapWithConcurrency handles an empty list", async () => {
  expect(await mapWithConcurrency([], 4, async () => 1)).toEqual([]);
});
