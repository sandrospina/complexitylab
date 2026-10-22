import { expect, test } from '@playwright/test';

test('the checker accepts the solution and rejects one wrong cell', async ({ page }) => {
  await page.goto('/?m=verify&tab=sudoku&size=4');
  await expect(page.getByTestId('check-verdict')).toHaveText('Not a solution yet');
  await page.getByRole('button', { name: 'Reveal solution' }).click();
  await expect(page.getByTestId('check-verdict')).toHaveText('Valid solution');
  const cell = page.getByRole('gridcell', { name: /^Row \d, column \d$/ }).first();
  const v = Number(await cell.inputValue());
  await cell.fill(String((v % 4) + 1));
  await expect(page.getByTestId('check-verdict')).toHaveText('Not a solution yet');
  await expect(page.getByTestId('solve-ops')).toHaveText(/^[\d,]+$/);
});

test('a subset-sum certificate is accepted, and a wrong one rejected', async ({ page }) => {
  await page.goto('/?m=verify&tab=subset&sn=12');
  await page.getByRole('button', { name: 'Show a solution' }).click();
  await expect(page.getByTestId('subset-verdict')).toHaveText('Certificate accepted');
  const picked = page.locator('button[aria-pressed="true"]').first();
  await picked.click();
  await expect(page.getByTestId('subset-verdict')).toContainText('Rejected');
});
