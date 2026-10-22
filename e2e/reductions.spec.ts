import { expect, test } from '@playwright/test';

const verdict = (page: import('@playwright/test').Page) => page.getByTestId('verdict');

test('3-colouring: encode, solve, decode, and hovering a clause lights its edge', async ({ page }) => {
  await page.goto('/?m=reductions&tab=coloring&preset=square');
  // 4 vertices and 5 edges: 12 variables, 4 + 12 + 15 clauses.
  await expect(page.getByTestId('var-count')).toHaveText('12');
  await expect(page.getByTestId('clause-count')).toHaveText('31');
  await expect(verdict(page)).toHaveAttribute('data-verdict', 'valid', { timeout: 20_000 });
  const differ = page.locator('.family', { hasText: 'adjacent vertices differ' }).getByTestId('clause').first();
  await differ.hover();
  await expect(page.locator('.ge.lit')).toHaveCount(1);
});

test('break-it: without "adjacent vertices differ" K4 gets a wrong colouring the decoder flags', async ({ page }) => {
  await page.goto('/?m=reductions&tab=coloring&preset=k4');
  await expect(verdict(page)).toHaveAttribute('data-verdict', 'unsat', { timeout: 20_000 });
  await page.getByLabel('Keep the clauses: adjacent vertices differ').uncheck();
  await expect(verdict(page)).toHaveAttribute('data-verdict', 'invalid', { timeout: 20_000 });
  await expect(page.getByTestId('violation').first()).toContainText('both ends have colour');
  await expect(page).toHaveURL(/omit=differ/);
});

test('the Petersen graph has no Hamiltonian cycle; the cube has one', async ({ page }) => {
  await page.goto('/?m=reductions&tab=hamiltonian&preset=petersen');
  await expect(page.getByTestId('var-count')).toHaveText('100');
  await expect(verdict(page)).toHaveAttribute('data-verdict', 'unsat', { timeout: 30_000 });
  await page.getByRole('combobox').first().selectOption('cube');
  await expect(verdict(page)).toHaveAttribute('data-verdict', 'valid', { timeout: 30_000 });
  await expect(page.getByText(/^tour: 0 → /)).toBeVisible();
});

test('k-clique: the k slider changes the encoding size', async ({ page }) => {
  await page.goto('/?m=reductions&tab=clique&preset=k4&k=3');
  await expect(verdict(page)).toHaveAttribute('data-verdict', 'valid', { timeout: 20_000 });
  const before = await page.getByTestId('clause-count').innerText();
  await page.getByRole('slider', { name: 'Clique size k' }).fill('5');
  await expect(page.getByTestId('clause-count')).not.toHaveText(before);
  await expect(verdict(page)).toHaveAttribute('data-verdict', 'unsat', { timeout: 20_000 });
});

test('Sudoku: the 9 × 9 puzzle encodes to 729 variables and solves', async ({ page }) => {
  await page.goto('/?m=reductions&tab=sudoku&size=9&seed=1');
  await expect(page.getByTestId('var-count')).toHaveText('729');
  await expect(verdict(page)).toHaveAttribute('data-verdict', 'valid', { timeout: 30_000 });
});

test('circuit: a satisfiable circuit lights its inputs, and the URL keeps the circuit', async ({ page }) => {
  await page.goto('/?m=reductions&tab=circuit');
  await expect(verdict(page)).toHaveAttribute('data-verdict', 'valid', { timeout: 20_000 });
  await expect(page.getByTestId('circuit-inputs')).toContainText('in1=');
  await page.getByRole('button', { name: 'Add OR' }).click();
  await expect(page).toHaveURL(/c=3%7C.*or/);
  await page.reload();
  await expect(page.getByRole('combobox', { name: 'Gate 4 type' })).toHaveValue('or');
});

test('quiz: flipping the arrow to the right direction scores', async ({ page }) => {
  await page.goto('/?m=reductions&tab=quiz');
  // Question 2: to solve Sudoku with a SAT solver the reduction goes Sudoku → SAT, so flip the default arrow.
  await page.getByRole('button', { name: /Question 2: .*flip it/ }).click();
  await page.getByRole('button', { name: 'Check' }).nth(1).click();
  await expect(page.getByTestId('quiz-2')).toHaveText('Right.');
  await page.getByRole('button', { name: 'Check' }).first().click();
  await expect(page.getByTestId('quiz-score')).toContainText('Score: 2 of 2');
});

test('Cook–Levin: too few steps is unsatisfiable, enough steps decodes the run', async ({ page }) => {
  await page.goto('/?m=reductions&tab=cook&tape=1101&T=3');
  await expect(verdict(page)).toHaveAttribute('data-verdict', 'unsat', { timeout: 20_000 });
  await page.getByRole('slider', { name: 'Steps T' }).fill('6');
  await expect(verdict(page)).toHaveAttribute('data-verdict', 'valid', { timeout: 20_000 });
  await expect(page.locator('table.tableau td.accept').first()).toBeVisible();
});
