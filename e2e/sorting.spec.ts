import { expect, test } from '@playwright/test';

test('gate: naive quicksort made quadratic in adversary mode', async ({ page }) => {
  await page.goto('/?m=sorting&tab=adversary&aalgo=quick-naive&adv=2,1,3,4,5,6,7,8,9,10');
  await expect(page.getByText('Quadratic reached!')).toHaveCount(0);
  // The student's last move: swap the first two values, leaving the array sorted.
  await page.getByRole('button', { name: 'Position 1, value 2' }).click();
  await page.getByRole('button', { name: 'Position 2, value 1' }).click();
  await expect(page.getByTestId('adv-score')).toHaveText('45');
  await expect(page.getByText('Quadratic reached!')).toBeVisible();
  await expect(page).toHaveURL(/adv=1%2C2%2C3/);
});

test('bubble sort: one swap that puts the smallest value last forces every pass', async ({ page }) => {
  // Sorted: one pass of n − 1 compares.
  await page.goto('/?m=sorting&tab=adversary&aalgo=bubble&adv=1,2,3,4,5,6,7,8');
  await expect(page.getByTestId('adv-score')).toHaveText('7');
  // [8, 2, …, 7, 1]: the 1 crawls left one place per pass, so all 8·7/2 compares are needed.
  await page.getByRole('button', { name: 'Position 1, value 1' }).click();
  await page.getByRole('button', { name: 'Position 8, value 8' }).click();
  await expect(page.getByTestId('adv-score')).toHaveText('28');
  await expect(page.getByText('Quadratic reached!')).toBeVisible();
});

test('adversary swaps two values and the URL reproduces the input', async ({ page }) => {
  await page.goto('/?m=sorting&tab=adversary&aalgo=insertion&adv=1,2,3,4,5,6,7,8');
  await expect(page.getByTestId('adv-score')).toHaveText('7');
  await page.getByRole('button', { name: 'Position 1, value 1' }).click();
  await page.getByRole('button', { name: 'Position 8, value 8' }).click();
  await expect(page.getByRole('button', { name: 'Position 1, value 8' })).toBeVisible();
  await expect(page).toHaveURL(/adv=8%2C2%2C3%2C4%2C5%2C6%2C7%2C1/);
});

test('gate: merge sort recursion tree sums level by level to (n/2) log2 n on sorted input', async ({ page }) => {
  await page.goto('/?m=sorting&tab=tree&talgo=merge&n=16&preset=sorted');
  await expect(page.getByTestId('level-sum-0')).toHaveText('8');
  await expect(page.getByTestId('level-sum-1')).toHaveCount(0);
  await page.getByRole('button', { name: 'Expand next level' }).click();
  await expect(page.getByTestId('level-sum-1')).toHaveText('8');
  await page.getByRole('button', { name: 'Expand all' }).click();
  for (const [d, v] of [[2, '8'], [3, '8'], [4, '0']] as const) {
    await expect(page.getByTestId(`level-sum-${d}`)).toHaveText(v);
  }
  await expect(page.getByTestId('tree-total')).toHaveText('32');
  await expect(page.getByText(/case 2 gives/)).toBeVisible();
});

test('naive quicksort on sorted input is outside the master theorem', async ({ page }) => {
  await page.goto('/?m=sorting&tab=tree&talgo=quick-naive&n=12&preset=sorted');
  await expect(page.getByText(/master theorem does not apply/)).toBeVisible();
  await page.getByRole('button', { name: 'Expand all' }).click();
  await expect(page.getByTestId('tree-total')).toHaveText('66');
});

test('race scrubs both sorts in lock-step', async ({ page }) => {
  await page.goto('/?m=sorting&tab=explore&algo=insertion&vs=merge&n=16&preset=reversed');
  const score = page.getByTestId('race-score');
  await page.getByRole('slider', { name: 'Scrub timeline' }).fill('40');
  await expect(page.getByTestId('step-label')).toHaveText(/^step 40 \//);
  await expect(score).toContainText('Insertion sort:');
  await expect(score).toContainText('Merge sort:');
  const max = Number((await page.getByTestId('step-label').textContent())!.split('/ ')[1]);
  await page.getByRole('slider', { name: 'Scrub timeline' }).fill(String(max));
  await expect(score).toContainText('Insertion sort: 120 compares');
  await expect(score).toContainText('Merge sort: 32 compares');
});

test('pick any set of sorts: they race together and share one scaling plot', async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto('/?m=sorting&tab=explore&algos=insertion&n=16&preset=reversed');
  const chip = (name: string) => page.getByRole('group', { name: 'Sorts to compare' }).getByRole('button', { name });
  await expect(chip('Insertion sort')).toHaveAttribute('aria-pressed', 'true');
  await chip('Bubble sort').click();
  await chip('Merge sort').click();
  await expect(page).toHaveURL(/algos=bubble%2Cinsertion%2Cmerge/);
  const score = page.getByTestId('race-score');
  for (const name of ['Bubble sort', 'Insertion sort', 'Merge sort']) await expect(score).toContainText(`${name}:`);

  await page.getByRole('button', { name: 'All', exact: true }).click();
  await page.getByRole('button', { name: 'Run scaling experiment' }).click();
  for (const [name, cls] of [
    ['Bubble sort', 'O(n²)'],
    ['Insertion sort', 'O(n²)'],
    ['Merge sort', 'O(n log n)'],
    // Reversed input is one strictly descending run: TimSort reverses it and is done.
    ['TimSort', 'O(n)'],
    ['Quicksort (last pivot)', 'O(n²)'],
    ['Quicksort (random pivot)', 'O(n log n)'],
  ] as const)
    await expect(page.getByTestId(`fit-${name}`)).toContainText(cls, { timeout: 60_000 });
});

test('TimSort finds the sorted runs: linear where merge sort is n log n', async ({ page }) => {
  await page.goto('/?m=sorting&tab=explore&algos=merge,tim&n=48&preset=runs');
  const slider = page.getByRole('slider', { name: 'Scrub timeline' });
  await slider.fill((await slider.getAttribute('max'))!);
  const score = page.getByTestId('race-score');
  await expect(score).toContainText('TimSort:');
  await page.getByRole('button', { name: 'Run scaling experiment' }).click();
  await expect(page.getByTestId('fit-TimSort')).toContainText('O(n)', { timeout: 60_000 });
  await expect(page.getByTestId('fit-Merge sort')).toContainText('O(n log n)');
});

test('the last selected sort cannot be removed, and old algo/vs links still work', async ({ page }) => {
  await page.goto('/?m=sorting&tab=explore&algo=quick-naive&vs=bubble&n=8');
  const group = page.getByRole('group', { name: 'Sorts to compare' });
  await expect(group.getByRole('button', { name: 'Bubble sort' })).toHaveAttribute('aria-pressed', 'true');
  await expect(group.getByRole('button', { name: 'Quicksort (last pivot)' })).toHaveAttribute('aria-pressed', 'true');
  await group.getByRole('button', { name: 'Bubble sort' }).click();
  const last = group.getByRole('button', { name: 'Quicksort (last pivot)' });
  await expect(last).toHaveAttribute('aria-disabled', 'true');
  await last.click({ force: true });
  await expect(last).toHaveAttribute('aria-pressed', 'true');
  await expect(page).toHaveURL(/algos=quick-naive(&|$)/);
});

test('scaling run on sorted input fits n² for naive quicksort', async ({ page }) => {
  await page.goto('/?m=sorting&tab=explore&algo=quick-naive&preset=sorted');
  await page.getByText('O(n²)', { exact: true }).click();
  await page.getByRole('button', { name: 'Run scaling experiment' }).click();
  await expect(page.getByTestId('fit-Quicksort (last pivot)')).toContainText('O(n²)', { timeout: 30_000 });
  await expect(page.getByRole('status').filter({ hasText: 'Measured' })).toContainText('Your prediction was right.');
});
