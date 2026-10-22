import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

// Gate 2: no UI freeze at the largest instances each module allows.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const w = window as unknown as { longTasks: number[] };
    w.longTasks = [];
    new PerformanceObserver((list) => list.getEntries().forEach((e) => w.longTasks.push(e.duration))).observe({
      type: 'longtask',
      buffered: true,
    });
  });
});

const longest = (page: Page) =>
  page.evaluate(() => Math.max(0, ...(window as unknown as { longTasks: number[] }).longTasks));

/** The timeline slider must respond while the worker is busy. */
async function scrub(page: Page) {
  await page.getByRole('slider', { name: 'Scrub timeline' }).fill('5');
  await expect(page.getByTestId('step-label')).toContainText('step 5 /', { timeout: 1000 });
}

test('gate: TSP with Held–Karp on 16 cities, and 20 cities of estimates', async ({ page }) => {
  await page.goto('/?m=tsp&k=16&seed=1');
  await scrub(page);
  await expect(page.getByTestId('cost-held-karp')).toHaveText(/^\d+\.\d$/, { timeout: 30_000 });
  await page.goto('/?m=tsp&k=20&seed=1');
  await expect(page.getByTestId('gap-heuristic')).toHaveText('unknown', { timeout: 20_000 });
  expect(await longest(page)).toBeLessThan(200);
});

test('gate: knapsack at the largest W', async ({ page }) => {
  await page.goto('/?m=knapsack&n=8&b=20');
  await scrub(page);
  await expect(page.getByTestId('dp-cells')).toHaveText('9,437,184', { timeout: 30_000 });
  expect(await longest(page)).toBeLessThan(200);
});

test('gate: the 9 × 9 Sudoku solver', async ({ page }) => {
  await page.goto('/?m=verify&tab=sudoku&size=9');
  await scrub(page);
  await expect(page.getByTestId('solve-ops')).toHaveText(/^[\d,]+$/, { timeout: 30_000 });
  expect(await longest(page)).toBeLessThan(200);
});
