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

test('focuses search with Ctrl+K', async ({ page }) => {
  await page.keyboard.press('Control+k');

  await expect(page.getByRole('searchbox', { name: 'Search contacts' })).toBeFocused();
});

test('selects the current query when focusing search with a shortcut', async ({ page }) => {
  const searchInput = page.getByRole('searchbox', { name: 'Search contacts' });

  await searchInput.fill('chris');
  await page.getByRole('heading', { name: 'My Contacts' }).click();
  await page.keyboard.press('Control+k');
  await page.keyboard.type('bob');

  await expect(searchInput).toHaveValue('bob');
  await expect(page.locator('#searchStatus')).toHaveText('1 contact found.');
});

test('clears the current search with Alt+X', async ({ page }) => {
  const searchInput = page.getByRole('searchbox', { name: 'Search contacts' });

  await searchInput.fill('chris');
  await page.keyboard.press('Alt+x');

  await expect(searchInput).toHaveValue('');
  await expect(searchInput).toBeFocused();
  await expect(page.locator('#searchStatus')).toHaveText('Showing all 25 contacts.');
});

test('focuses contact entry with Alt+A', async ({ page }) => {
  await page.keyboard.press('Alt+a');

  await expect(page.getByLabel('Add a contact')).toBeFocused();
});

test('focuses the first visible contact with Alt+L', async ({ page }) => {
  await page.getByRole('searchbox', { name: 'Search contacts' }).fill('chris');
  await page.keyboard.press('Alt+l');

  await expect(page.locator('.collection-item:not([hidden])').first()).toBeFocused();
  await expect(page.locator('.collection-item:not([hidden]) .contact-name').first()).toHaveText('Chris');
});

test('focuses reset filters with Alt+L when no contacts are visible', async ({ page }) => {
  await page.getByRole('searchbox', { name: 'Search contacts' }).fill('no matching contact');
  await page.keyboard.press('Alt+l');

  await expect(page.getByRole('button', { name: 'Reset filters' })).toBeFocused();
});

test('moves through visible contacts with the arrow keys', async ({ page }) => {
  const visibleContacts = page.locator('.collection-item:not([hidden])');

  await page.getByRole('searchbox', { name: 'Search contacts' }).fill('chris');
  await page.keyboard.press('Alt+l');
  await page.keyboard.press('ArrowDown');

  await expect(visibleContacts.nth(1)).toBeFocused();
  await page.keyboard.press('ArrowUp');
  await expect(visibleContacts.first()).toBeFocused();
});

test('jumps to the edges of visible contacts with Home and End', async ({ page }) => {
  const visibleContacts = page.locator('.collection-item:not([hidden])');

  await page.getByRole('searchbox', { name: 'Search contacts' }).fill('chris');
  await page.keyboard.press('Alt+l');
  await page.keyboard.press('End');
  await expect(visibleContacts.last()).toBeFocused();

  await page.keyboard.press('Home');
  await expect(visibleContacts.first()).toBeFocused();
});

test('toggles a focused contact as a favorite with Enter or Space', async ({ page }) => {
  await page.getByRole('searchbox', { name: 'Search contacts' }).fill('chris');
  await page.keyboard.press('Alt+l');
  await page.keyboard.press('Enter');

  await expect(page.getByRole('button', { name: 'Remove Chris from favorites' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );

  await page.keyboard.press('Space');
  await expect(page.getByRole('button', { name: 'Add Chris to favorites' })).toHaveAttribute(
    'aria-pressed',
    'false',
  );
});

test('restores the last removed contact with Alt+U', async ({ page }) => {
  await page.getByLabel('Add a contact').fill('Zara');
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await page.getByRole('button', { name: 'Remove Zara', exact: true }).click();

  await page.keyboard.press('Alt+u');

  await expect(page.getByText('Zara', { exact: true })).toBeVisible();
  await expect(page.locator('#addContactStatus')).toHaveText('Zara was restored.');
});

test('toggles backup tools with Alt+B', async ({ page }) => {
  await page.keyboard.press('Alt+b');

  await expect(page.locator('#dataTools')).toHaveAttribute('open', '');
  await expect(page.locator('#dataToolsSummary')).toBeFocused();

  await page.keyboard.press('Alt+b');
  await expect(page.locator('#dataTools')).not.toHaveAttribute('open', '');
});

test('closes focused backup tools with Escape', async ({ page }) => {
  await page.keyboard.press('Alt+b');
  await page.keyboard.press('Escape');

  await expect(page.locator('#dataTools')).not.toHaveAttribute('open', '');
  await expect(page.locator('#dataToolsSummary')).toBeFocused();
});

test('downloads a contact backup with Alt+E', async ({ page }) => {
  await page.evaluate(() => {
    window.backupDownloadClicked = false;
    URL.createObjectURL = () => 'blob:test-backup';
    URL.revokeObjectURL = () => {};
    HTMLAnchorElement.prototype.click = () => {
      window.backupDownloadClicked = true;
    };
  });

  await page.keyboard.press('Alt+e');

  await expect(page.locator('#dataTools')).toHaveAttribute('open', '');
  await expect(page.getByRole('button', { name: 'Download backup' })).toBeFocused();
  await expect.poll(() => page.evaluate(() => window.backupDownloadClicked)).toBe(true);
});

test('opens the backup restore picker with Alt+I', async ({ page }) => {
  await page.evaluate(() => {
    window.restorePickerOpened = false;
    HTMLInputElement.prototype.click = () => {
      window.restorePickerOpened = true;
    };
  });

  await page.keyboard.press('Alt+i');

  await expect(page.locator('#dataTools')).toHaveAttribute('open', '');
  await expect(page.locator('#importDataLabel')).toBeFocused();
  await expect.poll(() => page.evaluate(() => window.restorePickerOpened)).toBe(true);
});

test('opens the backup restore picker from the keyboard', async ({ page }) => {
  await page.evaluate(() => {
    window.restorePickerOpened = false;
    HTMLInputElement.prototype.click = () => {
      window.restorePickerOpened = true;
    };
  });

  await page.getByText('Backup and restore').click();
  await page.locator('#importDataLabel').focus();
  await page.keyboard.press('Enter');

  await expect.poll(() => page.evaluate(() => window.restorePickerOpened)).toBe(true);

  await page.evaluate(() => { window.restorePickerOpened = false; });
  await page.keyboard.press('Space');
  await expect.poll(() => page.evaluate(() => window.restorePickerOpened)).toBe(true);
});

test('copies the filtered contact link with Alt+C', async ({ page }) => {
  await page.evaluate(() => {
    window.copiedContactLink = '';
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: async (value) => {
          window.copiedContactLink = value;
        },
      },
    });
  });
  await page.getByRole('searchbox', { name: 'Search contacts' }).fill('chris');

  await page.keyboard.press('Alt+c');

  await expect(page.getByRole('button', { name: 'Copy link' })).toBeFocused();
  await expect(page.locator('#shareStatus')).toHaveText('Filtered contact link copied.');
  await expect.poll(() => page.evaluate(() => window.copiedContactLink)).toBe(page.url());
});

test('resets search and favorites with Alt+R', async ({ page }) => {
  const favoritesFilter = page.locator('#favoritesOnly');

  await page.getByRole('searchbox', { name: 'Search contacts' }).fill('anna');
  await favoritesFilter.click();

  await page.keyboard.press('Alt+r');

  await expect(page.getByRole('searchbox', { name: 'Search contacts' })).toHaveValue('');
  await expect(favoritesFilter).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('#searchStatus')).toHaveText('Showing all 25 contacts.');
  await expect(page).toHaveURL(/\/$/);
});

test('shows a keyboard shortcut reference', async ({ page }) => {
  const shortcutsButton = page.getByRole('button', { name: 'Shortcuts' });

  await shortcutsButton.click();
  await expect(page.getByRole('dialog', { name: 'Keyboard shortcuts' })).toBeVisible();
  await expect(page.getByText('Focus search').first()).toBeVisible();
  await expect(page.getByText('Toggle color theme')).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Keyboard shortcuts' })).toBeHidden();
  await expect(shortcutsButton).toBeFocused();
});

test('closes keyboard help when the backdrop is clicked', async ({ page }) => {
  const shortcutsButton = page.getByRole('button', { name: 'Shortcuts' });

  await shortcutsButton.click();
  await page.mouse.click(5, 5);

  await expect(page.getByRole('dialog', { name: 'Keyboard shortcuts' })).toBeHidden();
  await expect(shortcutsButton).toBeFocused();
});

test('opens the shortcut reference with Alt+H', async ({ page }) => {
  await page.keyboard.press('Alt+h');

  await expect(page.getByRole('dialog', { name: 'Keyboard shortcuts' })).toBeVisible();
  await expect(page.getByText('Show this shortcut reference').first()).toBeVisible();
});

test('opens the shortcut reference with the question-mark key', async ({ page }) => {
  await page.keyboard.type('?');

  await expect(page.getByRole('dialog', { name: 'Keyboard shortcuts' })).toBeVisible();
});

test('keeps global shortcuts from changing controls behind keyboard help', async ({ page }) => {
  await page.getByRole('button', { name: 'Shortcuts' }).click();

  await page.keyboard.press('Alt+t');
  await page.keyboard.press('Alt+a');

  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(page.getByLabel('Add a contact')).not.toBeFocused();
  await expect(page.getByRole('dialog', { name: 'Keyboard shortcuts' })).toBeVisible();
});

test('toggles a dark color theme', async ({ page }) => {
  const themeToggle = page.getByRole('button', { name: 'Dark mode' });

  await themeToggle.click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.getByRole('button', { name: 'Light mode' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );

  await page.getByRole('button', { name: 'Light mode' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
});

test('announces color theme changes to assistive technology', async ({ page }) => {
  const themeStatus = page.locator('#themeStatus');

  await page.getByRole('button', { name: 'Dark mode' }).click();
  await expect(themeStatus).toHaveText('Dark theme enabled.');

  await page.getByRole('button', { name: 'Use system theme' }).click();
  await expect(themeStatus).toHaveText('Using the system light theme.');
});

test('remembers the selected color theme', async ({ page }) => {
  await page.getByRole('button', { name: 'Dark mode' }).click();
  await page.reload();

  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.getByRole('button', { name: 'Light mode' })).toBeVisible();
});

test('uses the system color preference when no theme is saved', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.evaluate(() => localStorage.removeItem('mini-contact-app.theme'));
  await page.reload();

  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.getByRole('button', { name: 'Light mode' })).toBeVisible();
});

test('follows system color preference changes when no theme is saved', async ({ page }) => {
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');

  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

  await page.emulateMedia({ colorScheme: 'light' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
});

test('returns a manual theme choice to the system preference', async ({ page }) => {
  await page.getByRole('button', { name: 'Dark mode' }).click();
  await expect(page.getByRole('button', { name: 'Use system theme' })).toBeVisible();

  await page.getByRole('button', { name: 'Use system theme' }).click();

  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(page.getByRole('button', { name: 'Use system theme' })).toBeHidden();
  await expect(page.getByRole('button', { name: 'Dark mode' })).toBeFocused();
  await expect.poll(
    () => page.evaluate(() => localStorage.getItem('mini-contact-app.theme')),
  ).toBeNull();
});

test('returns to the system theme with Alt+M', async ({ page }) => {
  await page.getByRole('button', { name: 'Dark mode' }).click();
  await page.keyboard.press('Alt+m');

  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(page.locator('#themeStatus')).toHaveText('Using the system light theme.');
  await expect(page.getByRole('button', { name: 'Use system theme' })).toBeHidden();
});

test('toggles the color theme with Alt+T', async ({ page }) => {
  await page.keyboard.press('Alt+t');

  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.getByRole('button', { name: 'Light mode' })).toBeFocused();
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

test('clears a new contact draft with the Escape key', async ({ page }) => {
  const input = page.getByLabel('Add a contact');

  await input.fill('Zara');
  await input.press('Escape');

  await expect(input).toHaveValue('');
  await expect(page.locator('#contactNameCount')).toHaveText('0 of 60 characters');
  await expect(page.locator('#addContactStatus')).toHaveText('Contact entry cleared.');
});

test('keeps letter sections alphabetized when a new section is added', async ({ page }) => {
  await page.getByLabel('Add a contact').fill('Maria');
  await page.getByRole('button', { name: 'Add', exact: true }).click();

  await expect(page.locator('.collection-header h5')).toHaveText(['A', 'B', 'C', 'D', 'M', 'V']);
});

test('finds contacts without requiring accent marks', async ({ page }) => {
  await page.getByLabel('Add a contact').fill('José');
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await page.getByRole('searchbox', { name: 'Search contacts' }).fill('jose');

  await expect(page.locator('.collection-item:not([hidden]) .contact-name')).toHaveText(['José']);
  await expect(page.locator('#searchStatus')).toHaveText('1 contact found.');
});

test('normalizes saved contacts and ignores invalid entries', async ({ page }) => {
  await page.evaluate(() => {
    localStorage.setItem(
      'mini-contact-app.custom-contacts',
      JSON.stringify(['  Zara   Jane  ', 'ZARA JANE', 'x'.repeat(61), 42]),
    );
  });
  await page.reload();

  await expect(page.getByText('Zara Jane', { exact: true })).toHaveCount(1);
  await expect(page.locator('[data-custom="true"]')).toHaveCount(1);
  await expect.poll(() => page.evaluate(() => (
    localStorage.getItem('mini-contact-app.custom-contacts')
  ))).toBe('["Zara Jane"]');
});

test('removes accent-equivalent and unsafe contacts from browser storage', async ({ page }) => {
  await page.evaluate(() => {
    localStorage.setItem(
      'mini-contact-app.custom-contacts',
      JSON.stringify(['José', 'Jose', 'Zara\u0001Admin']),
    );
  });
  await page.reload();

  await expect(page.getByText('José', { exact: true })).toHaveCount(1);
  await expect(page.getByText('Jose', { exact: true })).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => (
    localStorage.getItem('mini-contact-app.custom-contacts')
  ))).toBe('["José"]');
});

test('shows how many custom contacts are saved', async ({ page }) => {
  await page.getByText('Backup and restore').click();
  await expect(page.locator('#savedContactStatus')).toHaveText('No custom contacts saved.');

  await page.getByLabel('Add a contact').fill('Zara');
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await expect(page.locator('#savedContactStatus')).toHaveText('1 custom contact saved.');

  await page.getByRole('button', { name: 'Remove Zara', exact: true }).click();
  await expect(page.locator('#savedContactStatus')).toHaveText('No custom contacts saved.');
});

test('offers to reset filters when no contacts match', async ({ page }) => {
  await page.getByRole('searchbox', { name: 'Search contacts' }).fill('not-a-contact');

  await expect(page.locator('#emptyState')).toBeVisible();
  await page.getByRole('button', { name: 'Reset filters' }).click();

  await expect(page.locator('#emptyState')).toBeHidden();
  await expect(page.locator('#searchStatus')).toHaveText('Showing all 25 contacts.');
  await expect(page.getByRole('searchbox', { name: 'Search contacts' })).toBeFocused();
});

test('shows the number of favorite contacts in the filter', async ({ page }) => {
  await expect(page.locator('#favoritesOnly')).toHaveText('Favorites (0)');

  await page.getByRole('button', { name: 'Add Anna to favorites' }).click();
  await expect(page.locator('#favoritesOnly')).toHaveText('Favorites (1)');

  await page.locator('#favoritesOnly').click();
  await expect(page.locator('#favoritesOnly')).toHaveText('Show all (1 favorite)');
});

test('shows the contact name character count', async ({ page }) => {
  await expect(page.locator('#contactNameCount')).toHaveText('0 of 60 characters');

  await page.getByLabel('Add a contact').fill('Zara');
  await expect(page.locator('#contactNameCount')).toHaveText('4 of 60 characters');

  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await expect(page.locator('#contactNameCount')).toHaveText('0 of 60 characters');
});

test('restores a removed custom contact with undo', async ({ page }) => {
  await page.getByLabel('Add a contact').fill('Zara');
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await page.getByRole('button', { name: 'Add Zara to favorites' }).click();
  await page.getByRole('button', { name: 'Remove Zara', exact: true }).click();

  await expect(page.getByText('Zara', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Undo remove' }).click();

  await expect(page.getByText('Zara', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Remove Zara from favorites' })).toBeVisible();
  await expect(page.locator('#addContactStatus')).toHaveText('Zara was restored.');
});

test('toggles the favorites filter with Alt+F', async ({ page }) => {
  await page.getByRole('button', { name: 'Add Anna to favorites' }).click();
  await page.keyboard.press('Alt+f');

  await expect(page.locator('#favoritesOnly')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#favoritesOnly')).toBeFocused();
  await expect(page.locator('#searchStatus')).toHaveText('Showing 1 favorite contact.');
});

test('restores saved favorites without case sensitivity', async ({ page }) => {
  await page.evaluate(() => {
    localStorage.setItem(
      'mini-contact-app.favorite-contacts',
      JSON.stringify(['anna', 'ANNA', 'Zara\u0001Admin']),
    );
  });
  await page.reload();

  await expect(page.getByRole('button', { name: 'Remove Anna from favorites' })).toBeVisible();
  await expect(page.locator('#favoritesOnly')).toHaveText('Favorites (1)');
  await expect.poll(() => page.evaluate(() => (
    localStorage.getItem('mini-contact-app.favorite-contacts')
  ))).toBe('["Anna"]');
});

test('restores saved favorites without accent sensitivity', async ({ page }) => {
  await page.getByLabel('Add a contact').fill('José');
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await page.evaluate(() => {
    localStorage.setItem('mini-contact-app.favorite-contacts', JSON.stringify(['jose']));
  });
  await page.reload();

  await expect(page.getByRole('button', { name: 'Remove José from favorites' })).toBeVisible();
});

test('groups accented and non-alphabetic contact names predictably', async ({ page }) => {
  for (const name of ['123 Services', 'Élodie']) {
    await page.getByLabel('Add a contact').fill(name);
    await page.getByRole('button', { name: 'Add', exact: true }).click();
  }

  await expect(page.locator('.collection-header h5')).toHaveText([
    '#', 'A', 'B', 'C', 'D', 'E', 'V',
  ]);
});

test('clears favorites without removing custom contacts', async ({ page }) => {
  await page.getByLabel('Add a contact').fill('Zara');
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await page.getByRole('button', { name: 'Add Zara to favorites' }).click();
  await page.getByText('Backup and restore').click();
  await page.getByRole('button', { name: 'Clear favorites', exact: true }).click();
  await page.getByRole('button', { name: 'Confirm clear favorites' }).click();

  await expect(page.getByText('Zara', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Add Zara to favorites' })).toBeVisible();
  await expect(page.locator('#favoritesOnly')).toHaveText('Favorites (0)');
  await expect(page.locator('#dataStatus')).toHaveText(
    'All favorites were cleared. Custom contacts were kept.',
  );
});

test('synchronizes the native search clear action', async ({ page }) => {
  const search = page.getByRole('searchbox', { name: 'Search contacts' });

  await search.fill('chris');
  await search.evaluate((input) => {
    input.value = '';
    input.dispatchEvent(new Event('search'));
  });

  await expect(page.locator('#searchStatus')).toHaveText('Showing all 25 contacts.');
  await expect(page).not.toHaveURL(/\?q=/);
});

test('shows filtered result counts in the browser tab title', async ({ page }) => {
  await expect(page).toHaveTitle('My Contacts');

  await page.getByRole('searchbox', { name: 'Search contacts' }).fill('chris');
  await expect(page).toHaveTitle('2 found — My Contacts');

  await page.getByRole('button', { name: 'Clear', exact: true }).click();
  await expect(page).toHaveTitle('My Contacts');
});

test('enables the clear favorites action only when needed', async ({ page }) => {
  await page.getByText('Backup and restore').click();
  const clearFavorites = page.getByRole('button', { name: 'Clear favorites', exact: true });

  await expect(clearFavorites).toBeDisabled();
  await page.getByRole('button', { name: 'Add Anna to favorites' }).click();
  await expect(clearFavorites).toBeEnabled();
});

test('discards stale undo actions when saved data is cleared', async ({ page }) => {
  await page.getByLabel('Add a contact').fill('Zara');
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await page.getByRole('button', { name: 'Remove Zara', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Undo remove' })).toBeVisible();

  await page.getByText('Backup and restore').click();
  await page.getByRole('button', { name: 'Clear saved data' }).click();
  await page.getByRole('button', { name: 'Confirm clear' }).click();

  await expect(page.getByRole('button', { name: 'Undo remove' })).toBeHidden();
});

test('copies a shareable link with the active filters', async ({ page }) => {
  await page.evaluate(() => {
    window.copiedContactLink = '';
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: async (value) => {
          window.copiedContactLink = value;
        },
      },
    });
  });
  await page.getByRole('searchbox', { name: 'Search contacts' }).fill('chris');
  await page.getByRole('button', { name: 'Copy link' }).click();

  await expect(page.locator('#shareStatus')).toHaveText('Filtered contact link copied.');
  await expect.poll(() => page.evaluate(() => window.copiedContactLink)).toBe(page.url());
});

test('toggles contact sections between ascending and descending order', async ({ page }) => {
  const headers = page.locator('.collection-header h5');

  await expect(headers.first()).toHaveText('A');
  await expect(headers.last()).toHaveText('V');
  await page.getByRole('button', { name: 'Order: A–Z' }).click();

  await expect(headers.first()).toHaveText('V');
  await expect(headers.last()).toHaveText('A');
  await expect(page.getByRole('button', { name: 'Order: Z–A' })).toBeVisible();
});

test('restores descending order from a shared URL', async ({ page }) => {
  await page.goto('/?sort=desc');

  await expect(page.locator('.collection-header h5').first()).toHaveText('V');
  await expect(page.getByRole('button', { name: 'Order: Z–A' })).toBeVisible();

  await page.getByRole('button', { name: 'Order: Z–A' }).click();
  await expect(page).not.toHaveURL(/sort=desc/);
});

test('toggles sort order with Alt+S', async ({ page }) => {
  await page.keyboard.press('Alt+s');

  await expect(page.getByRole('button', { name: 'Order: Z–A' })).toBeFocused();
  await expect(page.locator('.collection-header h5').first()).toHaveText('V');
  await expect(page).toHaveURL(/sort=desc/);
});

test('limits search queries restored from shared URLs', async ({ page }) => {
  const longQuery = 'x'.repeat(80);

  await page.goto(`/?q=${longQuery}`);

  await expect(page.getByRole('searchbox', { name: 'Search contacts' })).toHaveValue('x'.repeat(60));
  await expect(page).toHaveURL(new RegExp(`q=${'x'.repeat(60)}$`));
});

test('rejects contact names containing control characters', async ({ page }) => {
  const input = page.getByLabel('Add a contact');

  await input.evaluate((element) => {
    element.value = 'Zara\u0001Admin';
  });
  await page.getByRole('button', { name: 'Add', exact: true }).click();

  await expect(page.locator('#addContactStatus')).toHaveText(
    'Contact names cannot contain control characters.',
  );
  await expect(page.locator('[data-custom="true"]')).toHaveCount(0);
});

test('prevents duplicate contacts that differ only by accent marks', async ({ page }) => {
  await page.getByLabel('Add a contact').fill('José');
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await page.getByLabel('Add a contact').fill('Jose');
  await page.getByRole('button', { name: 'Add', exact: true }).click();

  await expect(page.locator('#addContactStatus')).toHaveText(
    'Jose is already in the contact list.',
  );
  await expect(page.locator('[data-custom="true"]')).toHaveCount(1);
});

test('rejects oversized contact backup files', async ({ page }) => {
  await page.getByText('Backup and restore').click();
  await page.locator('#importData').setInputFiles({
    name: 'large-backup.json',
    mimeType: 'application/json',
    buffer: Buffer.alloc(1_000_001, 'x'),
  });

  await expect(page.locator('#dataStatus')).toHaveText(
    'Contact backups must be 1 MB or smaller.',
  );
  await expect(page.locator('[data-custom="true"]')).toHaveCount(0);
});

test('exports contacts and favorites in stable alphabetical order', async ({ page }) => {
  for (const name of ['Zara', 'Aaron']) {
    await page.getByLabel('Add a contact').fill(name);
    await page.getByRole('button', { name: 'Add', exact: true }).click();
  }
  await page.getByRole('button', { name: 'Add Bob to favorites' }).click();
  await page.getByRole('button', { name: 'Add Anna to favorites' }).click();
  await page.getByRole('button', { name: 'Order: A–Z' }).click();
  await page.evaluate(() => {
    window.exportedBackupBlob = null;
    URL.createObjectURL = (blob) => {
      window.exportedBackupBlob = blob;
      return 'blob:test-backup';
    };
    URL.revokeObjectURL = () => {};
    HTMLAnchorElement.prototype.click = () => {};
  });
  await page.getByText('Backup and restore').click();
  await page.getByRole('button', { name: 'Download backup' }).click();

  const backup = await page.evaluate(async () => JSON.parse(await window.exportedBackupBlob.text()));
  expect(backup.customContacts).toEqual(['Aaron', 'Zara']);
  expect(backup.favorites).toEqual(['Anna', 'Bob']);
});

test('announces favorite changes to assistive technology', async ({ page }) => {
  await page.getByRole('button', { name: 'Add Anna to favorites' }).click();
  await expect(page.locator('#addContactStatus')).toHaveText('Anna was added to favorites.');

  await page.getByRole('button', { name: 'Remove Anna from favorites' }).click();
  await expect(page.locator('#addContactStatus')).toHaveText('Anna was removed from favorites.');
});

test('clears copied-link confirmation when filters change', async ({ page }) => {
  await page.evaluate(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: async () => {} },
    });
  });
  await page.getByRole('button', { name: 'Copy link' }).click();
  await expect(page.locator('#shareStatus')).toHaveText('Filtered contact link copied.');

  await page.getByRole('searchbox', { name: 'Search contacts' }).fill('anna');
  await expect(page.locator('#shareStatus')).toBeEmpty();
});

test('copies filtered links when the Clipboard API is unavailable', async ({ page }) => {
  await page.evaluate(() => {
    window.fallbackCopiedLink = '';
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: undefined,
    });
    document.execCommand = (command) => {
      window.fallbackCopiedLink = document.querySelector('textarea').value;
      return command === 'copy';
    };
  });
  await page.getByRole('searchbox', { name: 'Search contacts' }).fill('anna');
  await page.getByRole('button', { name: 'Copy link' }).click();

  await expect(page.locator('#shareStatus')).toHaveText('Filtered contact link copied.');
  await expect.poll(() => page.evaluate(() => window.fallbackCopiedLink)).toBe(page.url());
});

test('falls back when the Clipboard API rejects a copy request', async ({ page }) => {
  await page.evaluate(() => {
    window.recoveredCopiedLink = '';
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: async () => { throw new Error('Permission denied'); } },
    });
    document.execCommand = () => {
      window.recoveredCopiedLink = document.querySelector('textarea').value;
      return true;
    };
  });
  await page.getByRole('button', { name: 'Copy link' }).click();

  await expect(page.locator('#shareStatus')).toHaveText('Filtered contact link copied.');
  await expect.poll(() => page.evaluate(() => window.recoveredCopiedLink)).toBe(page.url());
});

test('dismisses copy confirmation with Escape', async ({ page }) => {
  await page.evaluate(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: async () => {} },
    });
  });
  await page.getByRole('button', { name: 'Copy link' }).click();
  await expect(page.locator('#shareStatus')).toHaveText('Filtered contact link copied.');

  await page.keyboard.press('Escape');
  await expect(page.locator('#shareStatus')).toBeEmpty();
  await expect(page.getByRole('button', { name: 'Copy link' })).toBeFocused();
});

test('enables clearing saved data only when data exists', async ({ page }) => {
  await page.getByText('Backup and restore').click();
  const clearSavedData = page.getByRole('button', { name: 'Clear saved data' });

  await expect(clearSavedData).toBeDisabled();
  await page.getByLabel('Add a contact').fill('Zara');
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await expect(clearSavedData).toBeEnabled();

  await clearSavedData.click();
  await page.getByRole('button', { name: 'Confirm clear' }).click();
  await expect(clearSavedData).toBeDisabled();
});

test('cancels destructive confirmations with Escape', async ({ page }) => {
  await page.getByRole('button', { name: 'Add Anna to favorites' }).click();
  await page.getByText('Backup and restore').click();

  const clearFavorites = page.getByRole('button', { name: 'Clear favorites', exact: true });
  await clearFavorites.click();
  await page.keyboard.press('Escape');
  await expect(page.locator('#clearFavoritesConfirmation')).toBeHidden();
  await expect(clearFavorites).toBeFocused();

  const clearSavedData = page.getByRole('button', { name: 'Clear saved data' });
  await clearSavedData.click();
  await page.keyboard.press('Escape');
  await expect(page.locator('#clearDataConfirmation')).toBeHidden();
  await expect(clearSavedData).toBeFocused();
});

test('deduplicates accent-equivalent names in restored backups', async ({ page }) => {
  await page.getByText('Backup and restore').click();
  await page.locator('#importData').setInputFiles({
    name: 'contacts.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify({
      version: 1,
      customContacts: ['José', 'Jose'],
      favorites: ['jose'],
    })),
  });

  await expect(page.getByText('José', { exact: true })).toHaveCount(1);
  await expect(page.getByText('Jose', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Remove José from favorites' })).toBeVisible();
});

test('rejects control characters in restored backup names', async ({ page }) => {
  await page.getByText('Backup and restore').click();
  await page.locator('#importData').setInputFiles({
    name: 'invalid-contacts.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify({
      version: 1,
      customContacts: ['Zara\u0001Admin'],
      favorites: [],
    })),
  });

  await expect(page.locator('#dataStatus')).toHaveText('This file is not a valid contact backup.');
  await expect(page.locator('[data-custom="true"]')).toHaveCount(0);
});
