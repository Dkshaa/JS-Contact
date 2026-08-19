const { test, expect } = require('@playwright/test');

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test('filters contacts and reports the visible result count', async ({ page }) => {
  await expect(page.locator('#searchStatus')).toHaveText('Showing all 25 contacts.');

  await page.getByRole('searchbox', { name: 'Search contacts' }).fill('chris');

  await expect(page.locator('#searchStatus')).toHaveText('2 contacts found.');
  await expect(page.locator('.collection-item:not([hidden]) .contact-name')).toHaveCount(2);
  await expect(page.locator('.collection-item:not([hidden]) mark')).toHaveCount(2);
  await expect(page).toHaveURL(/\?q=chris$/);
});

test('focuses search with the slash keyboard shortcut', async ({ page }) => {
  await page.keyboard.press('/');

  await expect(page.getByRole('searchbox', { name: 'Search contacts' })).toBeFocused();
});

test('persists favorites and edited custom contacts', async ({ page }) => {
  await page.getByLabel('Add a contact').fill('Zara');
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await expect(page.locator('#addContactStatus')).toHaveText('Zara was added.');

  await page.getByRole('button', { name: 'Add Zara to favorites' }).click();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Remove Zara from favorites' })).toBeVisible();

  await page.getByRole('button', { name: 'Edit Zara' }).click();
  await page.getByLabel('Add a contact').fill('Maria');
  await page.getByRole('button', { name: 'Update', exact: true }).click();
  await expect(page.locator('#addContactStatus')).toHaveText('Zara was updated to Maria.');

  await page.reload();
  await expect(page.getByText('Maria', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Remove Maria from favorites' })).toBeVisible();
  await expect(page.getByText('Zara', { exact: true })).toHaveCount(0);
});

test('cancels a custom contact edit without changing the contact', async ({ page }) => {
  await page.getByLabel('Add a contact').fill('Zara');
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await page.getByRole('button', { name: 'Edit Zara' }).click();
  await page.getByLabel('Add a contact').fill('Maria');
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();

  await expect(page.getByText('Zara', { exact: true })).toBeVisible();
  await expect(page.getByText('Maria', { exact: true })).toHaveCount(0);
  await expect(page.locator('#addContactStatus')).toHaveText('Editing Zara was canceled.');
  await expect(page.getByRole('button', { name: 'Add', exact: true })).toBeVisible();
});

test('cancels contact editing with the Escape key', async ({ page }) => {
  await page.getByLabel('Add a contact').fill('Zara');
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await page.getByRole('button', { name: 'Edit Zara' }).click();
  await page.getByLabel('Add a contact').fill('Maria');
  await page.getByLabel('Add a contact').press('Escape');

  await expect(page.getByLabel('Add a contact')).toHaveValue('');
  await expect(page.getByText('Zara', { exact: true })).toBeVisible();
  await expect(page.locator('#addContactStatus')).toHaveText('Editing Zara was canceled.');
});

test('keeps letter sections alphabetized when a new section is added', async ({ page }) => {
  await page.getByLabel('Add a contact').fill('Maria');
  await page.getByRole('button', { name: 'Add', exact: true }).click();

  await expect(page.locator('.collection-header h5')).toHaveText(['A', 'B', 'C', 'D', 'M', 'V']);
});
