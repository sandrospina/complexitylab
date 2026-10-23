import { expect, test } from '@playwright/test';

test('the home page has the course title and opens every module', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle('Complexity Lab :: Sandro Spina, Dept. of Computer Science');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Complexity Lab :: Sandro Spina, Dept. of Computer Science');
  await expect(page.getByText('Department of Computer Science, University of Malta')).toBeVisible();
  await expect(page.getByRole('button', { name: '⌂ Home' })).toHaveAttribute('aria-current', 'page');

  await page.getByRole('button', { name: 'Open SAT' }).click();
  await expect(page).toHaveURL(/\?m=sat/);
  await expect(page.getByRole('tab', { name: 'Lecture' })).toBeVisible();
  await page.getByRole('button', { name: '⌂ Home' }).click();
  await expect(page).not.toHaveURL(/m=/);
  await expect(page.getByRole('button', { name: /^Open / })).toHaveCount(10);
  // The browser's back button returns to the module.
  await page.goBack();
  await expect(page).toHaveURL(/\?m=sat/);
  await expect(page.getByRole('tab', { name: 'Lecture' })).toBeVisible();
});
