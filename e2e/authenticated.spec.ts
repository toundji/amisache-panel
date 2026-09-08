import { expect, test } from '@playwright/test';

/**
 * Parcours connecté — nécessite un compte réel ET une clé API valide.
 * Fournir via variables d'environnement :
 *   E2E_EMAIL, E2E_PASSWORD
 * (la clé API back-office doit être injectée dans le build servi ; la
 * config versionnée utilise un placeholder).
 *
 * Sauté automatiquement si les identifiants ne sont pas fournis.
 */
const EMAIL = process.env.E2E_EMAIL;
const PASSWORD = process.env.E2E_PASSWORD;

test.describe('Parcours connecté', () => {
  test.skip(!EMAIL || !PASSWORD, 'E2E_EMAIL / E2E_PASSWORD non fournis');

  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/login');
    await page.locator('#username').fill(EMAIL!);
    await page.locator('#password').fill(PASSWORD!);
    await page.getByRole('button', { name: /Se connecter/i }).click();
    await expect(page).toHaveURL(/\/$|\/(?!auth)/, { timeout: 30_000 });
  });

  test('le tableau de bord se charge après connexion', async ({ page }) => {
    await expect(page).not.toHaveURL(/\/auth\/login/);
    await expect(page.locator('app-sidebar')).toBeVisible();
  });

  test('navigation vers les entités ecclésiales', async ({ page }) => {
    await page.goto('/churches');
    await expect(page.getByRole('heading', { name: /Entités ecclésiales/i })).toBeVisible();
  });

  test('navigation vers l\'arborescence des entités', async ({ page }) => {
    await page.goto('/churches/tree');
    await expect(page.getByRole('heading', { name: /Arborescence des entités/i })).toBeVisible();
  });

  test('navigation vers les horaires liturgiques', async ({ page }) => {
    await page.goto('/liturgy/schedules');
    await expect(page.getByRole('heading', { name: /Horaires liturgiques/i })).toBeVisible();
  });

  test('navigation vers les moyens de paiement', async ({ page }) => {
    await page.goto('/payment/methods');
    await expect(page.getByRole('heading', { name: /Moyens de paiement/i })).toBeVisible();
  });

  test('navigation vers les publications', async ({ page }) => {
    await page.goto('/community/publications');
    await expect(page.getByRole('heading', { name: /Publications/i })).toBeVisible();
  });
});
