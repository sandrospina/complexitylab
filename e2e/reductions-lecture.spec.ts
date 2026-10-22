import { expect, test } from '@playwright/test';

test('gate: the NP-completeness lecture runs start to finish', async ({ page }) => {
  test.setTimeout(240_000);
  await page.addInitScript(() => {
    const w = window as unknown as { longTasks: number[] };
    w.longTasks = [];
    new PerformanceObserver((l) => l.getEntries().forEach((e) => w.longTasks.push(e.duration))).observe({ type: 'longtask', buffered: true });
  });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const next = (title: string) => page.getByRole('button', { name: `Next: ${title}` }).click();
  const verdict = page.getByTestId('verdict');

  await page.goto('/?m=reductions');
  await expect(page.locator('ol.lecture > li')).toHaveCount(9);
  await page.getByRole('button', { name: 'Show me: What a reduction is' }).click();
  await expect(page.getByTestId('quiz-score')).toBeVisible();

  await next('3-colouring, end to end');
  await expect(verdict).toHaveAttribute('data-verdict', 'valid', { timeout: 30_000 });

  await next('The size must stay polynomial');
  await expect(page.getByTestId('fit-clauses')).toContainText('O(n)', { timeout: 60_000 });

  await next('Break it');
  await expect(verdict).toHaveAttribute('data-verdict', 'invalid', { timeout: 30_000 });

  await next('k-clique: growth with k');
  await expect(verdict).toHaveAttribute('data-verdict', /valid|unsat/, { timeout: 30_000 });

  await next('Hamiltonian cycle: a large blow-up');
  await expect(verdict).toHaveAttribute('data-verdict', 'unsat', { timeout: 30_000 });

  await next('Sudoku: mostly propagation');
  await expect(verdict).toHaveAttribute('data-verdict', 'valid', { timeout: 30_000 });

  await next('Circuits → 3-SAT');
  await expect(verdict).toHaveAttribute('data-verdict', 'valid', { timeout: 30_000 });

  await next('Cook–Levin: why SAT came first');
  await expect(verdict).toHaveAttribute('data-verdict', 'valid', { timeout: 30_000 });
  await page.getByRole('button', { name: 'Back to the lecture' }).click();
  await expect(page.locator('ol.lecture > li').nth(8)).toHaveAttribute('aria-current', 'step');

  expect(errors).toEqual([]);
  expect(await page.evaluate(() => Math.max(0, ...(window as unknown as { longTasks: number[] }).longTasks))).toBeLessThan(200);
});
