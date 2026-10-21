import { expect, test } from '@playwright/test';

test('gate: BFS needs more frontier memory than DFS on a wide graph, and less on a deep one', async ({ page }) => {
  await page.goto('/?m=graphs&tab=traversal&preset=tree');
  await expect(page.getByTestId('peak-frontier-BFS')).toHaveText('8');
  await expect(page.getByTestId('peak-frontier-DFS')).toHaveText('4');
  await page.getByLabel('Preset').selectOption('path');
  await expect(page.getByTestId('peak-frontier-BFS')).toHaveText('1');
  await expect(page.getByTestId('peak-frontier-DFS')).toHaveText('15');
});

test('gate: the average-degree slider moves the Dijkstra crossover', async ({ page }) => {
  test.setTimeout(90_000);
  const crossover = page.getByTestId('crossover');
  const settle = async (kind: string) => {
    await expect(crossover).toHaveAttribute('data-kind', kind, { timeout: 30_000 });
    return Number(await crossover.getAttribute('data-n'));
  };
  await page.goto('/?m=graphs&tab=dijkstra&deg=4');
  const sparse = await settle('measured');
  const slider = page.getByRole('slider', { name: 'Average degree' });
  await slider.fill('4'); // index 4: k = 32
  await expect(page.getByTestId('degree')).toHaveText('32');
  const denser = await settle('measured');
  expect(denser).toBeGreaterThan(sparse);
  await slider.fill('7');
  await expect(page.getByTestId('degree')).toContainText('complete');
  await settle('never');
  await expect(crossover).toContainText('never cross');
});

test('editing the graph updates the URL and the trace', async ({ page }) => {
  await page.goto('/?m=graphs&tab=traversal&preset=path');
  await expect(page.getByTestId('graph-size')).toHaveText('V = 15, E = 14');
  const editor = page.getByRole('application', { name: /Graph editor/ });
  const box = (await editor.boundingBox())!;
  // The path leaves the bottom-right corner free.
  await editor.click({ position: { x: box.width * 0.97, y: box.height * 0.97 } });
  await expect(page.getByTestId('graph-size')).toHaveText('V = 16, E = 14');
  await expect(page).toHaveURL(/g=/);
  await page.getByRole('button', { name: 'Vertex 14', exact: true }).click();
  await page.getByRole('button', { name: 'Vertex 15', exact: true }).click();
  await expect(page.getByTestId('graph-size')).toHaveText('V = 16, E = 15');
  await expect(page.getByTestId('peak-frontier-DFS')).toHaveText('16');
  await page.reload();
  await expect(page.getByTestId('graph-size')).toHaveText('V = 16, E = 15');
});
