import { expect, test } from '@playwright/test';

test('binary search steps, scrubs, reproduces from the URL and benchmarks to log n', async ({ page }) => {
  await page.goto('/?m=search&algo=binary&n=16&kind=worst&step=2');
  const stepLabel = page.getByTestId('step-label');
  await expect(stepLabel).toHaveText(/^step 2 \/ \d+$/);

  await page.getByRole('button', { name: 'Step forward' }).click();
  await expect(stepLabel).toHaveText(/^step 3 \//);
  await expect(page).toHaveURL(/step=3/);
  // n = 16 worst case: alloc + 5 compares + 'not found' mark.
  await expect(page.getByTestId('ops-Binary search')).toHaveText('2');

  await page.getByRole('slider', { name: 'Scrub timeline' }).fill('7');
  await expect(stepLabel).toHaveText('step 7 / 7');
  await expect(page.getByTestId('ops-Binary search')).toHaveText('5');

  await page.getByText('O(log n)', { exact: true }).click();
  await page.getByRole('button', { name: 'Run scaling experiment' }).click();
  await expect(page.getByTestId('fit-Binary search')).toContainText('O(log n)', { timeout: 15_000 });
  await expect(page.getByRole('status').filter({ hasText: 'Measured' })).toContainText('Your prediction was right.');
});

test('race mode benchmarks both searches', async ({ page }) => {
  await page.goto('/?m=search&algo=race&n=32');
  await page.getByRole('button', { name: 'Run scaling experiment' }).click();
  await expect(page.getByTestId('fit-Linear search')).toContainText('O(n)', { timeout: 15_000 });
  await expect(page.getByTestId('fit-Binary search')).toContainText('O(log n)');
});

test('racing all four on spread values separates n, √n, log n and log log n', async ({ page }) => {
  await page.goto('/?m=search&algo=race&kind=uniform&n=64');
  await expect(page.getByRole('region', { name: 'Jump search animation' })).toBeVisible();
  await page.getByRole('button', { name: 'Run scaling experiment' }).click();
  await expect(page.getByTestId('fit-Interpolation search')).toContainText('O(log log n)', { timeout: 60_000 });
  await expect(page.getByTestId('fit-Jump search')).toContainText('O(√n)');
  await expect(page.getByTestId('fit-Binary search')).toContainText('O(log n)');
  await expect(page.getByTestId('fit-Linear search')).toContainText('O(n)');
});

test('interpolation search falls back to linear on the skewed array', async ({ page }) => {
  await page.goto('/?m=search&algo=interpolation&kind=skewed&n=16');
  // 15 probes, each with its range check.
  const slider = page.getByRole('slider', { name: 'Scrub timeline' });
  await slider.fill((await slider.getAttribute('max'))!);
  await expect(page.getByTestId('ops-Interpolation search')).toHaveText('30');
  await page.getByRole('button', { name: 'Run scaling experiment' }).click();
  await expect(page.getByTestId('fit-Interpolation search')).toContainText('O(n)', { timeout: 30_000 });
});

test('guess my number reports higher or lower', async ({ page }) => {
  await page.goto('/?m=search');
  await page.getByRole('spinbutton', { name: 'Your guess' }).fill('50');
  await page.getByRole('button', { name: 'Guess', exact: true }).click();
  await expect(page.getByText(/too (low|high)|Found it/)).toBeVisible();
});

test('growth-rate wall shows the exponential wall', async ({ page }) => {
  await page.goto('/?m=growth-wall');
  await expect(page.getByTestId('wall-exp2-second')).toHaveText('29');
  await expect(page.getByTestId('wall-n2-second')).toHaveText('31,622');
  await page.getByRole('button', { name: 'Search' }).click();
  await expect(page).toHaveURL(/m=search/);
});
