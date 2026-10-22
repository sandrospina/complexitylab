import { expect, test } from '@playwright/test';

test('brute force and Held–Karp agree, and the heuristic gap is not negative', async ({ page }) => {
  await page.goto('/?m=tsp&k=8&seed=3');
  const brute = page.getByTestId('cost-brute');
  await expect(brute).toHaveText(/^\d+\.\d$/, { timeout: 20_000 });
  await expect(page.getByTestId('cost-held-karp')).toHaveText(await brute.innerText());
  await expect(page.getByTestId('gap-heuristic')).toHaveText(/^\d+\.\d%$/);
  await expect(page.getByTestId('gap-held-karp')).toHaveText('0.0%');
});

test('beyond the exact caps the table estimates instead of running', async ({ page }) => {
  await page.goto('/?m=tsp&k=12&seed=1');
  await expect(page.getByTestId('estimate-brute')).toContainText('not run');
  await expect(page.getByTestId('cost-held-karp')).toHaveText(/^\d+\.\d$/, { timeout: 20_000 });
  await page.goto('/?m=tsp&k=18&seed=1');
  await expect(page.getByTestId('estimate-held-karp')).toContainText('not run');
  await expect(page.getByTestId('gap-heuristic')).toHaveText('unknown', { timeout: 20_000 });
});

test('clicking the map adds a city and the URL keeps it', async ({ page }) => {
  await page.goto('/?m=tsp&k=5&seed=2');
  await expect(page.getByTestId('city-count')).toHaveText('5 cities');
  await page.getByRole('application', { name: /Map with 5 cities/ }).click({ position: { x: 20, y: 20 } });
  await expect(page.getByTestId('city-count')).toHaveText('6 cities');
  await expect(page).toHaveURL(/c=/);
  await page.reload();
  await expect(page.getByTestId('city-count')).toHaveText('6 cities');
});
