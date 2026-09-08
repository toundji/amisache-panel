import { expect, test } from '@playwright/test';

test.describe('Formulaire de connexion', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/login');
  });

  test('soumettre le formulaire vide marque les champs invalides et ne navigue pas', async ({ page }) => {
    await page.getByRole('button', { name: /Se connecter/i }).click();

    await expect(page.locator('#username')).toHaveClass(/is-invalid/);
    await expect(page.locator('#password')).toHaveClass(/is-invalid/);
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test('un email mal formé affiche le message de validation', async ({ page }) => {
    await page.locator('#username').fill('pas-un-email');
    await page.locator('#password').click(); // déclenche le blur / valueChanges
    await expect(page.getByText('Veuillez entrer un email valide')).toBeVisible();
  });

  test('un mot de passe trop court affiche le minimum requis', async ({ page }) => {
    await page.locator('#password').fill('123');
    await page.locator('#username').click();
    await expect(page.getByText('Minimum 8 caractères requis')).toBeVisible();
  });

  test('le bouton œil bascule la visibilité du mot de passe', async ({ page }) => {
    const pwd = page.locator('#password');
    await pwd.fill('secret123');
    await expect(pwd).toHaveAttribute('type', 'password');

    await page.getByRole('button', { name: /Afficher/i }).click();
    await expect(pwd).toHaveAttribute('type', 'text');

    await page.getByRole('button', { name: /Masquer/i }).click();
    await expect(pwd).toHaveAttribute('type', 'password');
  });

  test('des identifiants invalides remontent une erreur de connexion', async ({ page }) => {
    test.slow(); // l'appel réseau vers l'API distante peut être lent

    await page.locator('#username').fill('inconnu@example.com');
    await page.locator('#password').fill('motdepasse123');
    await page.getByRole('button', { name: /Se connecter/i }).click();

    // Soit le popup SweetAlert « Connexion impossible », soit l'alerte inline.
    const swal = page.locator('.swal2-popup');
    const inlineAlert = page.locator('.alert-danger');
    await expect(swal.or(inlineAlert).first()).toBeVisible({ timeout: 30_000 });
    await expect(page).toHaveURL(/\/auth\/login/);
  });
});
