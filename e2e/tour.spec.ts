import { expect, test } from '@playwright/test';

/**
 * Visite guidée en UN seul test (donc UNE seule vidéo continue) : login
 * puis passage sur chaque grande section du panel. Sert de démo visuelle
 * — lancer avec `E2E_WATCH=1 ... --headed --workers=1 e2e/tour.spec.ts`.
 * Sauté sans identifiants.
 */
const EMAIL = process.env.E2E_EMAIL;
const PASSWORD = process.env.E2E_PASSWORD;

test.describe('Visite guidée', () => {
  test.skip(!EMAIL || !PASSWORD, 'E2E_EMAIL / E2E_PASSWORD non fournis');
  test.slow();

  test('login puis passage sur toutes les sections', async ({ page }) => {
    await page.goto('/auth/login');
    await page.locator('#username').fill(EMAIL!);
    await page.locator('#password').fill(PASSWORD!);
    await page.getByRole('button', { name: /Se connecter/i }).click();
    await expect(page).not.toHaveURL(/\/auth\/login/, { timeout: 45_000 });
    await expect(page.getByRole('heading', { name: 'Tableau de bord' })).toBeVisible();

    const stops: Array<[string, RegExp]> = [
      ['/users', /Utilisateurs/i],
      ['/churches', /Entités ecclésiales/i],
      ['/churches/tree', /Arborescence des entités/i],
      ['/clergy-members', /Clerg[ée]/i],
      ['/entrances', /Entrées/i],
      ['/memberships', /Abonnements fidèles/i],
      ['/liturgy/schedules', /Horaires liturgiques/i],
      ['/liturgy/requests', /Demandes/i],
      ['/liturgy/donations', /Dons/i],
      ['/payment/methods', /Moyens de paiement/i],
      ['/payment/transactions', /Paiements/i],
      ['/community/groups', /Groupes/i],
      ['/community/publications', /Publications/i],
      ['/geo/countries', /Pays/i],
      ['/types', /Types/i],
    ];

    for (const [path, heading] of stops) {
      await page.goto(path);
      await expect(page.getByRole('heading', { name: heading }).first()).toBeVisible();
      await page.waitForTimeout(700);
    }

    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Tableau de bord' })).toBeVisible();
  });
});
