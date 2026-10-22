import { expect, test } from '@playwright/test';

test('gate: the SAT lecture runs start to finish, and the phase transition peaks near 4.26', async ({ page }) => {
  test.setTimeout(240_000);
  await page.addInitScript(() => {
    const w = window as unknown as { longTasks: number[] };
    w.longTasks = [];
    new PerformanceObserver((l) => l.getEntries().forEach((e) => w.longTasks.push(e.duration))).observe({ type: 'longtask', buffered: true });
  });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const next = (title: string) => page.getByRole('button', { name: `Next: ${title}` }).click();

  await page.goto('/?m=sat');
  await expect(page.getByRole('listitem')).toHaveCount(7);
  await page.getByRole('button', { name: 'Show me: Formulas in CNF' }).click();
  await expect(page.getByTestId('clause-1')).toBeVisible();
  await expect(page.getByTestId('dpll-result')).toHaveText('satisfiable');

  await next('The truth table');
  await expect(page.getByTestId('tt-result')).toHaveText('unsatisfiable');
  await expect(page.getByTestId('tt-decisions')).toHaveText('8 rows');

  await next('The 2ⁿ wall');
  await expect(page.getByTestId('fit-Truth table')).toContainText('O(2ⁿ)', { timeout: 120_000 });

  await next('Search: decide and backtrack');
  await expect(page.getByLabel('Unit propagation')).not.toBeChecked();
  await expect(page.getByTestId('dpll-result')).toHaveText('unsatisfiable');
  const backtracking = Number(await page.getByTestId('dpll-decisions').innerText());

  await next('Unit propagation');
  await expect(page.getByLabel('Unit propagation')).toBeChecked();
  await expect(page.getByTestId('dpll-decisions')).toHaveText('2');
  expect(backtracking).toBeGreaterThan(2);

  await next('Choosing what to decide');
  await expect(page.getByTestId('shootout-3')).toBeVisible({ timeout: 120_000 });

  await next('The phase transition');
  const summary = page.getByTestId('phase-summary');
  await expect(summary).toHaveAttribute('data-peak', /\d/, { timeout: 120_000 });
  for (const attr of ['data-peak', 'data-crossing']) {
    const v = Number(await summary.getAttribute(attr));
    expect(v).toBeGreaterThanOrEqual(3.8);
    expect(v).toBeLessThanOrEqual(5.0);
  }
  await page.getByRole('button', { name: 'Back to the lecture' }).click();
  await expect(page.getByRole('listitem').nth(6)).toHaveAttribute('aria-current', 'step');

  expect(errors).toEqual([]);
  expect(await page.evaluate(() => Math.max(0, ...(window as unknown as { longTasks: number[] }).longTasks))).toBeLessThan(200);
});
