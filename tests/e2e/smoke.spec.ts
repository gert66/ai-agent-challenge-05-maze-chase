import { expect, test } from '@playwright/test';

test('shows a start overlay that is dismissed by starting the game', async ({ page }) => {
  await page.goto('/');

  const overlay = page.getByTestId('overlay-start');
  await expect(overlay).toBeVisible();

  await page.getByTestId('start-button').click();
  await expect(overlay).toBeHidden();
});

test('renders the maze, canvas, and initial HUD', async ({ page }) => {
  await page.goto('/');

  const canvas = page.getByTestId('game-canvas');
  await expect(canvas).toBeVisible();
  const box = await canvas.boundingBox();
  expect(box?.width).toBeGreaterThan(0);
  expect(box?.height).toBeGreaterThan(0);

  await expect(page.getByTestId('hud-score')).toHaveText('Score: 0');
  await expect(page.getByTestId('hud-lives')).toHaveText('Lives: 3');
});

test('keyboard input starts the game, moves the player, and collects a pellet', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => window.__mazeChase !== undefined);

  const initialState = await page.evaluate(() => window.__mazeChase.getState());
  const startTile = { ...initialState.player.pos };
  expect(initialState.collectables.score).toBe(0);

  await page.locator('body').click();
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('overlay-start')).toBeHidden();

  await page.keyboard.press('ArrowUp');

  await page.waitForFunction(
    (start) => {
      const state = window.__mazeChase.getState();
      return state.player.pos.y !== start.y && state.collectables.score > 0;
    },
    startTile,
    { timeout: 5_000 },
  );

  const movedState = await page.evaluate(() => window.__mazeChase.getState());
  expect(movedState.player.pos).not.toEqual(startTile);
  expect(movedState.collectables.score).toBeGreaterThan(0);
});

test('restart resets score, lives, and game-over state', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => window.__mazeChase !== undefined);

  await page.locator('body').click();
  await page.keyboard.press('Enter');
  await page.keyboard.press('ArrowUp');
  await page.waitForFunction(() => window.__mazeChase.getState().collectables.score > 0, undefined, {
    timeout: 5_000,
  });

  await page.evaluate(() => window.__mazeChase.restart());

  const state = await page.evaluate(() => window.__mazeChase.getState());
  expect(state.collectables.score).toBe(0);
  expect(state.lives).toBe(3);
  expect(state.gameOver).toBe(false);
});

test('mute button toggles its pressed state and label', async ({ page }) => {
  await page.goto('/');

  const muteButton = page.getByTestId('mute-button');
  const initiallyPressed = await muteButton.getAttribute('aria-pressed');
  const initialLabel = await muteButton.textContent();

  await muteButton.click();

  await expect(muteButton).not.toHaveAttribute('aria-pressed', initiallyPressed ?? '');
  const toggledLabel = await muteButton.textContent();
  expect(toggledLabel).not.toEqual(initialLabel);

  await muteButton.click();
  await expect(muteButton).toHaveAttribute('aria-pressed', initiallyPressed ?? '');
});
