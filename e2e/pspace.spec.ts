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

test('Savitch: both find no path past the cut; Savitch holds ⌈log₂ n⌉ + 1 frames and fits n^(log n) time', async ({ page }) => {
  await page.goto('/?m=time-space&tab=savitch&rn=8&rk=unreachable');
  const slider = page.getByRole('slider', { name: 'Scrub timeline' });
  await slider.fill('40');
  await expect(page.getByRole('list', { name: 'Call stack' }).getByRole('listitem')).toHaveCount(4);
  await expect(page.getByTestId('savitch-bits')).toHaveText('4 of 4 frames × 4 numbers × 3 bits = 48 bits');
  await slider.fill((await slider.getAttribute('max'))!);
  await expect(page.getByTestId('result-reach-bfs')).toHaveText('t is not reachable from s');
  await expect(page.getByTestId('result-reach-savitch')).toHaveText('t is not reachable from s');
  const memory = page.getByRole('region', { name: 'Memory and operations' });
  await expect(memory.locator('.mem-block', { hasText: 'Breadth-first search' })).toContainText('peak 16');
  await expect(memory.locator('.mem-block', { hasText: 'Savitch' })).toContainText('peak 4');

  await page.getByRole('button', { name: 'Run scaling experiment' }).click();
  await expect(page.getByTestId('fit-Savitch')).toContainText('O(log n)', { timeout: 60_000 });
  await expect(page.getByTestId('fit-Breadth-first search')).toContainText('O(n)');
  await page.getByLabel('Scaling metric').selectOption('ops');
  await expect(page.getByTestId('fit-Savitch')).toContainText('O(nˡᵒᵍ ⁿ)');
});

test('Geography: a formula board shows its value; playing moves gets replies until someone is stuck', async ({ page }) => {
  await page.goto('/?m=time-space&tab=geography&gb=exists-unsat&gn=1');
  await expect(page.getByTestId('geo-formula')).toContainText('false, so ∀ (the computer) can always win');
  const board = page.getByRole('region', { name: 'Play' });
  await page.getByLabel('Show which moves win').check();
  // ∃x₁ over (x₁) ∧ (¬x₁): whichever side you walk, the computer picks the clause that is now false.
  for (let k = 0; k < 4; k++) {
    const status = page.getByTestId('geo-status');
    if (!(await status.textContent())!.startsWith('Your move')) break;
    await board.getByRole('button', { name: /a legal move/ }).first().click();
    await expect(status).not.toHaveText('The computer is thinking…', { timeout: 5_000 });
  }
  await expect(page.getByTestId('geo-status')).toHaveText('You have no move: the computer wins.');
  await page.getByRole('button', { name: 'New game' }).click();
  await expect(page.getByTestId('geo-status')).toContainText('Your move');

  const slider = page.getByRole('slider', { name: 'Scrub timeline' });
  await slider.fill((await slider.getAttribute('max'))!);
  await expect(page.getByTestId('result-geography')).toHaveText('player 2 wins with best play');
  await page.getByRole('button', { name: 'Run scaling experiment' }).click();
  await expect(page.getByTestId('fit-Minimax')).toContainText('O(2ⁿ)', { timeout: 60_000 });
});
