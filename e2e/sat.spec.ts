import { expect, test } from '@playwright/test';

test('negating a literal edits the formula, recolours the clauses and updates the URL', async ({ page }) => {
  await page.goto('/?m=sat&tab=workspace&preset=example');
  await expect(page.getByTestId('dpll-result')).toHaveText('satisfiable');
  // At the end of the run DPLL has a model, so every clause is satisfied.
  const slider = page.getByRole('slider', { name: 'Scrub timeline' });
  await slider.fill((await slider.getAttribute('max'))!);
  for (let c = 1; c <= 5; c++) await expect(page.getByTestId(`clause-${c}`)).toHaveAttribute('data-status', 'satisfied');
  await page.getByRole('button', { name: 'Clause 1, literal x1: negate' }).click();
  await expect(page.getByRole('button', { name: 'Clause 1, literal ¬x1: negate' })).toBeVisible();
  await expect(page).toHaveURL(/f=4%3A-1/);
  // The edit restarts the run: nothing assigned yet, so no clause is satisfied.
  await expect(page.getByTestId('clause-1')).toHaveAttribute('data-status', 'open');
});

test('DIMACS import replaces the formula, and bad input is reported by line', async ({ page }) => {
  await page.goto('/?m=sat&tab=workspace&preset=example');
  const box = page.getByRole('textbox', { name: 'DIMACS CNF' });
  await box.fill('c two clauses\np cnf 2 2\n1 2 0\n-1 0\n');
  await page.getByRole('button', { name: 'Import' }).click();
  await expect(page.getByTestId('clause-2')).toBeVisible();
  await expect(page.getByTestId('clause-3')).toHaveCount(0);
  await expect(box).toHaveValue('p cnf 2 2\n1 2 0\n-1 0');
  await expect(page).toHaveURL(/f=2%3A1\+2%2C-1/);
  await box.fill('p cnf 2 1\n1 5 0');
  await page.getByRole('button', { name: 'Import' }).click();
  await expect(page.getByRole('alert')).toHaveText('line 2: variable 5 is above 2');
});

test('on 3 pigeons in 2 holes DPLL needs 2 decisions where the truth table checks 64 rows', async ({ page }) => {
  await page.goto('/?m=sat&tab=workspace&preset=php3&up=1');
  await expect(page.getByTestId('tt-result')).toHaveText('unsatisfiable');
  await expect(page.getByTestId('dpll-result')).toHaveText('unsatisfiable');
  await expect(page.getByTestId('tt-decisions')).toHaveText('64 rows');
  await expect(page.getByTestId('dpll-decisions')).toHaveText('2');
  await expect(page.getByRole('img', { name: 'Search tree with 2 decisions, 1 deep' })).toBeVisible();
  // Without unit propagation it is plain backtracking, with more decisions.
  await page.getByLabel('Unit propagation').uncheck();
  await expect(page.getByTestId('dpll-decisions')).toHaveText(/^(?!2$)\d+$/);
  expect(Number(await page.getByTestId('dpll-decisions').innerText())).toBeGreaterThan(2);
  await expect(page).toHaveURL(/up=0/);
});
