import { expect, test } from '@playwright/test';

test('TQBF: the unsatisfiable all-∃ formula is false; the recursion uses n + 1 frames, the table 2ⁿ cells', async ({ page }) => {
  await page.goto('/?m=time-space&tab=qbf&qn=4&qk=exists-unsat');
  await expect(page.getByTestId('qbf-formula')).toContainText('∃x₁ ∃x₂ ∃x₃ ∃x₄');
  const slider = page.getByRole('slider', { name: 'Scrub timeline' });
  await slider.fill((await slider.getAttribute('max'))!);
  await expect(page.getByTestId('result-qbf-recursive')).toHaveText('false: ∀ wins');
  await expect(page.getByTestId('result-qbf-table')).toHaveText('false: ∀ wins');
  await expect(page.getByRole('img', { name: 'Search tree with 31 nodes, 5 deep' })).toBeVisible();
  const memory = page.getByRole('region', { name: 'Memory and operations' });
  await expect(memory.locator('.mem-block', { hasText: 'Recursive evaluation' })).toContainText('peak 5');
  await expect(memory.locator('.mem-block', { hasText: 'Bottom-up table' })).toContainText('peak 16');

  await page.getByText('Where this sits').click();
  await expect(page.getByRole('listitem', { name: 'PSPACE = NPSPACE' })).toHaveClass(/now/);

  await page.getByRole('button', { name: 'Run scaling experiment' }).click();
  await expect(page.getByTestId('fit-Recursive evaluation')).toContainText('O(n)', { timeout: 60_000 });
  await expect(page.getByTestId('fit-Bottom-up table')).toContainText('O(2ⁿ)');
  await expect(page).toHaveURL(/tab=qbf/);
});
