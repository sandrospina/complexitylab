import { expect, test } from '@playwright/test';

test('memoisation collapses the fib(8) call tree from 67 calls to 15', async ({ page }) => {
  await page.goto('/?m=time-space&algo=naive&n=8');
  await expect(page.getByTestId('call-count')).toContainText('67 calls');
  await expect(page.getByRole('img', { name: 'Call tree with 67 calls, 8 deep' })).toBeVisible();
  await page.getByRole('radio', { name: 'Memoised recursion' }).click();
  await expect(page.getByTestId('call-count')).toContainText('15 calls');
  await expect(page.getByTestId('call-count')).toContainText('Naive recursion makes 67');
  await expect(page.getByRole('img', { name: 'Call tree with 15 calls, 8 deep' })).toBeVisible();
  await expect(page).toHaveURL(/algo=memo/);
  await expect(page.getByText('fib(8) =')).toContainText('21');
});

test('the scaling run fits φⁿ for naive recursion and n for memoisation', async ({ page }) => {
  await page.goto('/?m=time-space');
  await page.getByRole('button', { name: 'Run scaling experiment' }).click();
  await expect(page.getByTestId('fit-Naive recursion')).toContainText('O(φⁿ)', { timeout: 30_000 });
  await expect(page.getByTestId('fit-Memoised recursion')).toContainText('O(n)');
  await page.getByLabel('Scaling metric').selectOption('mem');
  await expect(page.getByTestId('fit-Iterative')).toContainText('O(1)');
});
