import { expect, test } from '@playwright/test';

test('adding a bit doubles the DP table and leaves brute force unchanged', async ({ page }) => {
  await page.goto('/?m=knapsack&n=6&b=5');
  await expect(page.getByTestId('capacity')).toHaveText('31');
  // (n + 1)(W + 1) = 7 · 32 cells; 4 ops for each of the 2⁶ − 1 subset steps.
  await expect(page.getByTestId('dp-cells')).toHaveText('224');
  await expect(page.getByTestId('brute-ops')).toHaveText('252');
  await page.getByRole('button', { name: 'Add a bit' }).click();
  await expect(page.getByTestId('capacity')).toHaveText('63');
  await expect(page.getByTestId('dp-cells')).toHaveText('448');
  await expect(page.getByTestId('brute-ops')).toHaveText('252');
  await expect(page).toHaveURL(/b=6/);
});

test('scaling in the bits of W: the DP is exponential, brute force flat', async ({ page }) => {
  await page.goto('/?m=knapsack&axis=bits');
  await page.getByRole('button', { name: 'Run scaling experiment' }).click();
  await expect(page.getByTestId('fit-Dynamic programming')).toContainText('O(2ⁿ)', { timeout: 60_000 });
  await expect(page.getByTestId('fit-Brute force')).toContainText('O(1)');
});
