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

test('cycle detection: both find the loop; the hash set needs O(n) cells, Floyd O(1)', async ({ page }) => {
  await page.goto('/?m=time-space&tab=cycle&cn=14&ck=balanced');
  await expect(page.getByTestId('rho-shape')).toHaveText('tail μ = 7, loop λ = 7');
  const slider = page.getByRole('slider', { name: 'Scrub timeline' });
  await slider.fill((await slider.getAttribute('max'))!);
  await expect(page.getByTestId('result-cycle-hash')).toHaveText('found μ = 7, λ = 7');
  await expect(page.getByTestId('result-cycle-floyd')).toHaveText('found μ = 7, λ = 7');
  const memory = page.getByRole('region', { name: 'Memory and operations' });
  await expect(memory.locator('.mem-block', { hasText: 'Hash set' })).toContainText('peak 14');
  await expect(memory.locator('.mem-block', { hasText: 'Floyd' })).toContainText('peak 4');

  await page.getByRole('button', { name: 'Run scaling experiment' }).click();
  await expect(page.getByTestId('fit-Hash set')).toContainText('O(n)', { timeout: 30_000 });
  await expect(page.getByTestId("fit-Floyd's tortoise and hare")).toContainText('O(1)');
  await page.getByLabel('Scaling metric').selectOption('ops');
  await expect(page.getByTestId("fit-Floyd's tortoise and hare")).toContainText('O(n)');
  await expect(page).toHaveURL(/tab=cycle/);
});

test('LCS: same length three ways; the table needs n² cells, two rows and Hirschberg O(n)', async ({ page }) => {
  await page.goto('/?m=time-space&tab=lcs&ln=7&lk=similar');
  const slider = page.getByRole('slider', { name: 'Scrub timeline' });
  await slider.fill((await slider.getAttribute('max'))!);
  const table = await page.getByTestId('result-lcs-table').innerText();
  const length = table.match(/^length (\d+)/)![1];
  await expect(page.getByTestId('result-lcs-rows')).toHaveText(`length ${length}, the subsequence is lost`);
  await expect(page.getByTestId('result-lcs-hirschberg')).toContainText(`length ${length}:`);
  const memory = page.getByRole('region', { name: 'Memory and operations' });
  await expect(memory.locator('.mem-block', { hasText: 'Full table' })).toContainText('peak 64');
  await expect(memory.locator('.mem-block', { hasText: 'Two rows' })).toContainText('peak 16');

  await page.getByRole('button', { name: 'Run scaling experiment' }).click();
  await expect(page.getByTestId('fit-Hirschberg')).toContainText('O(n)', { timeout: 60_000 });
  await expect(page.getByTestId('fit-Full table')).toContainText('O(n²)');
  await expect(page.getByTestId('fit-Two rows (length only)')).toContainText('O(n)');
  await page.getByLabel('Scaling metric').selectOption('ops');
  await expect(page.getByTestId('fit-Hirschberg')).toContainText('O(n²)');
});
