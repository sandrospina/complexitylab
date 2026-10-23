import { expect, test } from '@playwright/test';

test('insertion sort: the pseudocode follows the run and its counts match the formulas', async ({ page }) => {
  await page.goto('/?m=sorting&tab=explore&algos=insertion&n=10&preset=reversed');
  await page.getByRole('button', { name: 'Show code' }).click();
  const table = page.getByRole('table', { name: 'Pseudocode of INSERTION-SORT(A)' });
  await expect(table).toBeVisible();

  // One step in: the first comparison has run once, and its line is highlighted.
  await page.getByRole('button', { name: 'Step forward' }).click();
  await page.getByRole('button', { name: 'Step forward' }).click();
  await expect(page.getByTestId('pseudo-count-4')).toHaveText('1');
  await expect(table.locator('tr.now')).toHaveCount(1);

  // At the end: the CLRS worst-case column for n = 10.
  const slider = page.getByRole('slider', { name: 'Scrub timeline' });
  await slider.fill((await slider.getAttribute('max'))!);
  await expect(page.getByTestId('pseudo-count-1')).toHaveText('10');
  await expect(page.getByTestId('pseudo-count-3')).toHaveText('54');
  await expect(page.getByTestId('pseudo-count-4')).toHaveText('45');
  await expect(page.getByTestId('pseudo-count-5')).toHaveText('45');
  // Lines 4 and 5 dominate: 90 = 0.900 · n².
  await expect(page.getByTestId('pseudo-measured')).toContainText('90');
  await expect(page.getByTestId('pseudo-measured')).toContainText('0.900');
});

test('the TypeScript tab shows the running source and highlights the current line’s tags', async ({ page }) => {
  await page.goto('/?m=search&algo=binary&n=16&kind=worst&step=3');
  await page.getByRole('button', { name: 'Show code' }).click();
  await page.getByRole('tab', { name: 'TypeScript' }).click();
  const source = page.locator('pre[aria-label="Source of search/binary.ts"]');
  await expect(source).toContainText('export const binarySearch');
  // Step 3 is a comparison, tagged line 4 in the source.
  await expect(page.getByTestId('source-now')).toContainText('line: 4');
  await expect(page.getByRole('link', { name: 'view on GitHub' })).toHaveAttribute('href', /src\/algorithms\/search\/binary\.ts$/);
});

test('a race offers the code for each algorithm', async ({ page }) => {
  await page.goto('/?m=search&algo=race&n=16');
  await expect(page.getByRole('button', { name: 'Show code' })).toHaveCount(4);
});

test('every module offers the code of its algorithms', async ({ page }) => {
  const pages: [string, string][] = [
    ['/?m=time-space&tab=fib&algo=memo&n=6', 'FIB(n), and MEMO-FIB(n)'],
    ['/?m=time-space&tab=cycle&cn=10', 'CYCLE-HASH(f, x₀)'],
    ['/?m=time-space&tab=lcs&ln=6', 'HIRSCHBERG(a, b)'],
    ['/?m=graphs&tab=dijkstra&preset=grid', 'DIJKSTRA-HEAP(G, w, s)'],
    ['/?m=knapsack&n=4&b=4', 'KNAPSACK-DP(w, v, W)'],
    ['/?m=tsp&k=6&seed=1', 'HELD-KARP(P)'],
    ['/?m=verify&tab=sudoku&size=4', 'SUDOKU-CHECK(B)'],
    ['/?m=sat&tab=workspace&preset=php3', 'DPLL(φ)'],
    ['/?m=reductions&tab=coloring&preset=square', '3-COLOURING-TO-SAT(G)'],
  ];
  for (const [url, title] of pages) {
    await page.goto(url);
    const buttons = page.getByRole('button', { name: 'Show code' });
    await expect(buttons.first()).toBeVisible({ timeout: 20_000 });
    const n = await buttons.count();
    for (let i = 0; i < n; i++) await buttons.nth(0).click();
    await expect(page.getByRole('table', { name: `Pseudocode of ${title}` }), url).toBeVisible();
  }
});
