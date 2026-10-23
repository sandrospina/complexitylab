import { expect, test } from '@playwright/test';

test('the operations total drills down into counts per kind', async ({ page }) => {
  await page.goto('/?m=search&algo=binary&n=16&kind=worst');
  const slider = page.getByRole('slider', { name: 'Scrub timeline' });
  await slider.fill((await slider.getAttribute('max'))!);
  await expect(page.getByTestId('ops-Binary search')).toHaveText('5');
  await expect(page.getByRole('table', { name: 'Operations by kind' })).toHaveCount(0);

  await page.getByRole('button', { name: 'Show breakdown' }).click();
  // Five compares make up the whole total; the one allocation (lo, hi, mid) is bookkeeping.
  await expect(page.getByTestId('op-Binary search-compare')).toHaveText('5 100%');
  await expect(page.getByTestId('op-Binary search-alloc')).toHaveText('1');
  await expect(page.getByTestId('op-Binary search-read')).toHaveCount(0);
  await page.getByLabel('Include unused kinds').check();
  await expect(page.getByTestId('op-Binary search-read')).toHaveText('0');

  // The breakdown follows the timeline.
  await slider.fill('2');
  await expect(page.getByTestId('op-Binary search-compare')).toHaveText('1 100%');
  await page.getByRole('button', { name: 'Hide breakdown' }).click();
  await expect(page.getByRole('table', { name: 'Operations by kind' })).toHaveCount(0);
});

test('in a race the breakdown has a column per algorithm', async ({ page }) => {
  await page.goto('/?m=sorting&algo=insertion&vs=merge&n=8&preset=reversed');
  await page.getByRole('button', { name: 'Show breakdown' }).click();
  const table = page.getByRole('table', { name: 'Operations by kind' });
  await expect(table.getByRole('columnheader', { name: 'Insertion sort' })).toBeVisible();
  await expect(table.getByRole('columnheader', { name: 'Merge sort' })).toBeVisible();
  const slider = page.getByRole('slider', { name: 'Scrub timeline' });
  await slider.fill((await slider.getAttribute('max'))!);
  // Reversed input of 8: insertion sort compares and swaps every pair, 8·7/2 = 28 each.
  await expect(page.getByTestId('op-Insertion sort-compare')).toContainText('28');
  await expect(page.getByTestId('op-Insertion sort-swap')).toContainText('28');
});
