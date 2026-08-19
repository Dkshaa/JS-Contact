const filterInput = document.getElementById('filterInput');
const clearFilter = document.getElementById('clearFilter');
const favoritesOnlyButton = document.getElementById('favoritesOnly');
const addContactForm = document.getElementById('addContactForm');
const contactNameInput = document.getElementById('contactName');
const addContactSubmit = document.getElementById('addContactSubmit');
const cancelContactEditButton = document.getElementById('cancelContactEdit');
const addContactStatus = document.getElementById('addContactStatus');
const contactList = document.getElementById('names');
const searchStatus = document.getElementById('searchStatus');
const exportDataButton = document.getElementById('exportData');
const importDataInput = document.getElementById('importData');
const clearSavedDataButton = document.getElementById('clearSavedData');
const clearDataConfirmation = document.getElementById('clearDataConfirmation');
const confirmClearDataButton = document.getElementById('confirmClearData');
const cancelClearDataButton = document.getElementById('cancelClearData');
const dataStatus = document.getElementById('dataStatus');
const customContactsKey = 'mini-contact-app.custom-contacts';
const favoriteContactsKey = 'mini-contact-app.favorite-contacts';
const favoriteNames = new Set();
let contactBeingEdited = null;
let showFavoritesOnly = false;

addContactForm.addEventListener('submit', handleAddContact);
cancelContactEditButton.addEventListener('click', cancelContactEdit);
contactNameInput.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && contactBeingEdited) {
    cancelContactEdit();
  }
});
filterInput.addEventListener('input', () => filterNames());
filterInput.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && filterInput.value) {
    clearSearch();
  }
});
clearFilter.addEventListener('click', clearSearch);
favoritesOnlyButton.addEventListener('click', toggleFavoritesOnly);
exportDataButton.addEventListener('click', exportContactData);
importDataInput.addEventListener('change', importContactData);
clearSavedDataButton.addEventListener('click', showClearDataConfirmation);
confirmClearDataButton.addEventListener('click', clearSavedData);
cancelClearDataButton.addEventListener('click', hideClearDataConfirmation);
window.addEventListener('popstate', restoreSearchFromUrl);
document.addEventListener('keydown', focusSearchWithShortcut);

loadSavedContacts();
loadFavoriteNames();
initializeFavoriteControls();
sortContactSections();
restoreSearchFromUrl();

function exportContactData() {
  const customContacts = [...contactList.querySelectorAll('[data-custom="true"]')].map(
    (contact) => contact.querySelector('.contact-name').dataset.name,
  );
  const backup = {
    version: 1,
    exportedAt: new Date().toISOString(),
    customContacts,
    favorites: [...favoriteNames],
  };
  const file = new Blob([`${JSON.stringify(backup, null, 2)}\n`], {
    type: 'application/json',
  });
  const downloadUrl = URL.createObjectURL(file);
  const downloadLink = document.createElement('a');

  downloadLink.href = downloadUrl;
  downloadLink.download = `contact-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.append(downloadLink);
  downloadLink.click();
  downloadLink.remove();
  window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 0);
  dataStatus.textContent = `Backup downloaded with ${customContacts.length} custom contact${customContacts.length === 1 ? '' : 's'}.`;
}

async function importContactData() {
  const [file] = importDataInput.files;

  if (!file) {
    return;
  }

  try {
    const backup = validateBackup(JSON.parse(await file.text()));

    restoreBackup(backup);
    dataStatus.textContent = `Backup restored with ${backup.customContacts.length} custom contact${backup.customContacts.length === 1 ? '' : 's'}.`;
  } catch {
    dataStatus.textContent = 'This file is not a valid contact backup.';
  } finally {
    importDataInput.value = '';
  }
}

function validateBackup(value) {
  if (
    !value ||
    value.version !== 1 ||
    !Array.isArray(value.customContacts) ||
    !Array.isArray(value.favorites)
  ) {
    throw new Error('Unsupported backup format');
  }

  const normalizeNames = (names) =>
    names.map((name) => {
      if (typeof name !== 'string') {
        throw new Error('Invalid contact name');
      }

      const normalizedName = name.trim().replace(/\s+/g, ' ');

      if (!normalizedName || normalizedName.length > 60) {
        throw new Error('Invalid contact name');
      }

      return normalizedName;
    });

  return {
    customContacts: [...new Map(
      normalizeNames(value.customContacts).map((name) => [name.toLocaleLowerCase(), name]),
    ).values()],
    favorites: [...new Map(
      normalizeNames(value.favorites).map((name) => [name.toLocaleLowerCase(), name]),
    ).values()],
  };
}

function restoreBackup(backup) {
  removeCustomContactsFromPage();

  const existingNames = new Set(
    [...contactList.querySelectorAll('.contact-name')].map((contact) =>
      contact.dataset.name.toLocaleLowerCase(),
    ),
  );

  backup.customContacts.forEach((name) => {
    if (!existingNames.has(name.toLocaleLowerCase())) {
      addContact(name, { persist: false });
      existingNames.add(name.toLocaleLowerCase());
    }
  });

  const availableNames = new Map(
    [...contactList.querySelectorAll('.contact-name')].map((contact) => [
      contact.dataset.name.toLocaleLowerCase(),
      contact.dataset.name,
    ]),
  );

  favoriteNames.clear();
  backup.favorites.forEach((name) => {
    const availableName = availableNames.get(name.toLocaleLowerCase());

    if (availableName) {
      favoriteNames.add(availableName);
    }
  });

  updateAllFavoriteButtons();
  saveCustomContacts();
  saveFavoriteNames();
  filterNames();
}

function removeCustomContactsFromPage() {
  contactList.querySelectorAll('[data-custom="true"]').forEach((contact) => {
    const header = findSectionHeader(contact);

    contact.remove();
    removeHeaderWhenEmpty(header);
  });
  resetContactForm();
}

function updateAllFavoriteButtons() {
  contactList.querySelectorAll('.collection-item').forEach((contact) => {
    const name = contact.querySelector('.contact-name').dataset.name;

    updateFavoriteButton(contact.querySelector('.favorite-contact'), name);
  });
}

function showClearDataConfirmation() {
  clearSavedDataButton.hidden = true;
  clearDataConfirmation.hidden = false;
  confirmClearDataButton.focus();
}

function hideClearDataConfirmation() {
  clearDataConfirmation.hidden = true;
  clearSavedDataButton.hidden = false;
  clearSavedDataButton.focus();
}

function clearSavedData() {
  removeCustomContactsFromPage();
  favoriteNames.clear();
  showFavoritesOnly = false;
  updateAllFavoriteButtons();
  updateFavoritesFilterButton();
  saveCustomContacts();
  saveFavoriteNames();
  filterNames();
  hideClearDataConfirmation();
  dataStatus.textContent = 'Saved contacts and favorites were cleared.';
}

function handleAddContact(event) {
  event.preventDefault();

  const name = contactNameInput.value.trim().replace(/\s+/g, ' ');
  const isDuplicate = [...contactList.querySelectorAll('.contact-name')].some(
    (nameElement) =>
      nameElement.closest('.collection-item') !== contactBeingEdited &&
      nameElement.textContent.trim().toLocaleLowerCase() === name.toLocaleLowerCase(),
  );

  if (!name) {
    addContactStatus.textContent = 'Enter a contact name.';
    return;
  }

  if (isDuplicate) {
    addContactStatus.textContent = `${name} is already in the contact list.`;
    return;
  }

  if (contactBeingEdited) {
    updateCustomContact(contactBeingEdited, name);
    return;
  }

  addContact(name);
  addContactForm.reset();
  addContactStatus.textContent = `${name} was added.`;
}

function addContact(name, { persist = true } = {}) {
  const sectionLetter = name[0].toLocaleUpperCase();
  let header = [...contactList.querySelectorAll('.collection-header')].find(
    (item) => item.textContent.trim() === sectionLetter,
  );

  if (!header) {
    header = document.createElement('li');
    const heading = document.createElement('h5');

    header.className = 'collection-header';
    heading.textContent = sectionLetter;
    header.append(heading);
    contactList.append(header);
  }

  const contact = document.createElement('li');
  const nameElement = document.createElement('span');
  const actions = document.createElement('span');
  const editButton = document.createElement('button');
  const removeButton = document.createElement('button');

  contact.className = 'collection-item';
  contact.dataset.custom = 'true';
  nameElement.className = 'contact-name';
  nameElement.textContent = name;
  actions.className = 'contact-actions';
  editButton.className = 'btn-flat edit-contact';
  editButton.type = 'button';
  editButton.textContent = 'Edit';
  editButton.setAttribute('aria-label', `Edit ${name}`);
  editButton.addEventListener('click', editCustomContact);
  removeButton.className = 'btn-flat remove-contact';
  removeButton.type = 'button';
  removeButton.textContent = 'Remove';
  removeButton.setAttribute('aria-label', `Remove ${name}`);
  removeButton.addEventListener('click', removeCustomContact);
  actions.append(editButton, removeButton);
  contact.append(nameElement, actions);
  attachFavoriteButton(contact);
  header.after(contact);

  sortContactSections();
  filterNames();

  if (persist) {
    saveCustomContacts();
  }

  return contact;
}

function initializeFavoriteControls() {
  contactList.querySelectorAll('.collection-item').forEach(attachFavoriteButton);
}

function attachFavoriteButton(contact) {
  const nameElement = contact.querySelector('.contact-name');
  const name = nameElement.dataset.name ?? nameElement.textContent.trim();
  const existingButton = contact.querySelector('.favorite-contact');

  if (existingButton) {
    updateFavoriteButton(existingButton, name);
    return;
  }

  let actions = contact.querySelector('.contact-actions');

  if (!actions) {
    actions = document.createElement('span');
    actions.className = 'contact-actions';
    contact.append(actions);
  }

  const favoriteButton = document.createElement('button');

  favoriteButton.className = 'btn-flat favorite-contact';
  favoriteButton.type = 'button';
  favoriteButton.addEventListener('click', toggleFavorite);
  actions.prepend(favoriteButton);
  updateFavoriteButton(favoriteButton, name);
}

function toggleFavorite(event) {
  const contact = event.currentTarget.closest('.collection-item');
  const name = contact.querySelector('.contact-name').dataset.name;

  if (favoriteNames.has(name)) {
    favoriteNames.delete(name);
  } else {
    favoriteNames.add(name);
  }

  updateFavoriteButton(event.currentTarget, name);
  saveFavoriteNames();

  if (showFavoritesOnly) {
    filterNames();
  }
}

function updateFavoriteButton(button, name) {
  const isFavorite = favoriteNames.has(name);

  button.textContent = isFavorite ? '★' : '☆';
  button.setAttribute('aria-pressed', String(isFavorite));
  button.setAttribute(
    'aria-label',
    `${isFavorite ? 'Remove' : 'Add'} ${name} ${isFavorite ? 'from' : 'to'} favorites`,
  );
}

function loadFavoriteNames() {
  try {
    const savedFavorites = JSON.parse(localStorage.getItem(favoriteContactsKey) ?? '[]');
    const availableNames = new Set(
      [...contactList.querySelectorAll('.contact-name')].map((contact) => contact.textContent.trim()),
    );

    if (Array.isArray(savedFavorites)) {
      savedFavorites
        .filter((name) => typeof name === 'string' && availableNames.has(name))
        .forEach((name) => favoriteNames.add(name));
    }
  } catch {
    addContactStatus.textContent = 'Saved favorites could not be loaded.';
  }
}

function saveFavoriteNames() {
  try {
    localStorage.setItem(favoriteContactsKey, JSON.stringify([...favoriteNames]));
  } catch {
    addContactStatus.textContent = 'Favorite changes could not be saved.';
  }
}

function loadSavedContacts() {
  try {
    const savedContacts = JSON.parse(localStorage.getItem(customContactsKey) ?? '[]');

    if (!Array.isArray(savedContacts)) {
      return;
    }

    savedContacts.forEach((name) => {
      const normalizedName = typeof name === 'string' ? name.trim() : '';
      const alreadyExists = [...contactList.querySelectorAll('.contact-name')].some(
        (contact) =>
          contact.textContent.trim().toLocaleLowerCase() === normalizedName.toLocaleLowerCase(),
      );

      if (normalizedName && !alreadyExists) {
        addContact(normalizedName, { persist: false });
      }
    });
  } catch {
    addContactStatus.textContent = 'Saved contacts could not be loaded.';
  }
}

function editCustomContact(event) {
  const contact = event.currentTarget.closest('[data-custom="true"]');
  const currentName = contact.querySelector('.contact-name').dataset.name;

  contactBeingEdited = contact;
  contactNameInput.value = currentName;
  addContactSubmit.textContent = 'Update';
  cancelContactEditButton.hidden = false;
  addContactStatus.textContent = `Editing ${currentName}.`;
  contactNameInput.focus();
}

function cancelContactEdit() {
  const name = contactBeingEdited.querySelector('.contact-name').dataset.name;

  resetContactForm();
  addContactStatus.textContent = `Editing ${name} was canceled.`;
  contactNameInput.focus();
}

function updateCustomContact(contact, updatedName) {
  const currentName = contact.querySelector('.contact-name').dataset.name;
  const previousHeader = findSectionHeader(contact);
  const wasFavorite = favoriteNames.delete(currentName);

  contact.remove();
  removeHeaderWhenEmpty(previousHeader);
  const updatedContact = addContact(updatedName, { persist: false });

  if (wasFavorite) {
    favoriteNames.add(updatedName);
    updateFavoriteButton(updatedContact.querySelector('.favorite-contact'), updatedName);
  }

  saveCustomContacts();
  saveFavoriteNames();
  filterNames();
  resetContactForm();
  addContactStatus.textContent = `${currentName} was updated to ${updatedName}.`;
}

function removeCustomContact(event) {
  const contact = event.currentTarget.closest('[data-custom="true"]');
  const name = contact.querySelector('.contact-name').dataset.name;
  const header = findSectionHeader(contact);

  favoriteNames.delete(name);
  saveFavoriteNames();

  if (contact === contactBeingEdited) {
    resetContactForm();
  }

  contact.remove();
  removeHeaderWhenEmpty(header);

  saveCustomContacts();
  filterNames();
  addContactStatus.textContent = `${name} was removed.`;
}

function resetContactForm() {
  contactBeingEdited = null;
  addContactForm.reset();
  addContactSubmit.textContent = 'Add';
  cancelContactEditButton.hidden = true;
}

function findSectionHeader(contact) {
  let header = contact.previousElementSibling;

  while (header && !header.classList.contains('collection-header')) {
    header = header.previousElementSibling;
  }

  return header;
}

function removeHeaderWhenEmpty(header) {
  if (header && (!header.nextElementSibling || header.nextElementSibling.matches('.collection-header'))) {
    header.remove();
  }
}

function saveCustomContacts() {
  const customContacts = [...contactList.querySelectorAll('[data-custom="true"]')].map(
    (contact) => contact.querySelector('.contact-name').dataset.name,
  );

  try {
    localStorage.setItem(customContactsKey, JSON.stringify(customContacts));
  } catch {
    addContactStatus.textContent = 'This contact could not be saved for your next visit.';
  }
}

function sortContactSections() {
  const headers = [...contactList.querySelectorAll('.collection-header')];

  headers.forEach((header) => {
    const contacts = [];
    let item = header.nextElementSibling;

    while (item && !item.classList.contains('collection-header')) {
      contacts.push(item);
      item = item.nextElementSibling;
    }

    contacts
      .sort((first, second) =>
        first.textContent.trim().localeCompare(second.textContent.trim(), undefined, {
          sensitivity: 'base',
        }),
      )
      .forEach((contact) => contactList.insertBefore(contact, item));
  });

  const sections = headers.map((header) => {
    const items = [header];
    let item = header.nextElementSibling;

    while (item && !item.classList.contains('collection-header')) {
      items.push(item);
      item = item.nextElementSibling;
    }

    return items;
  });

  sections
    .sort((first, second) =>
      first[0].textContent.trim().localeCompare(second[0].textContent.trim(), undefined, {
        sensitivity: 'base',
      }),
    )
    .forEach((section) => contactList.append(...section));
}

function filterNames(syncUrl = true) {
  const query = normalizeForSearch(filterInput.value.trim());
  const contacts = contactList.querySelectorAll('.collection-item');
  const headers = contactList.querySelectorAll('.collection-header');
  let visibleCount = 0;

  contacts.forEach((contact) => {
    const nameElement = contact.querySelector('.contact-name');
    const originalName = nameElement.dataset.name ?? nameElement.textContent.trim();
    const normalizedName = normalizeForSearch(originalName);
    const matchesQuery = normalizedName.includes(query);
    const matchesFavoriteFilter = !showFavoritesOnly || favoriteNames.has(originalName);
    const isMatch = matchesQuery && matchesFavoriteFilter;

    nameElement.dataset.name = originalName;
    renderMatch(nameElement, originalName, query, isMatch);
    contact.hidden = !isMatch;
    visibleCount += Number(isMatch);
  });

  headers.forEach((header) => {
    let item = header.nextElementSibling;
    let hasVisibleContact = false;

    while (item && !item.classList.contains('collection-header')) {
      if (item.classList.contains('collection-item') && !item.hidden) {
        hasVisibleContact = true;
      }
      item = item.nextElementSibling;
    }

    header.hidden = !hasVisibleContact;
  });

  searchStatus.textContent = showFavoritesOnly && !query
    ? `Showing ${visibleCount} favorite contact${visibleCount === 1 ? '' : 's'}.`
    : query
      ? `${visibleCount} contact${visibleCount === 1 ? '' : 's'} found.`
      : `Showing all ${visibleCount} contacts.`;
  clearFilter.disabled = query.length === 0;

  if (syncUrl) {
    updateSearchUrl(query);
  }
}

function normalizeForSearch(value) {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase();
}

function renderMatch(nameElement, name, query, isMatch) {
  nameElement.replaceChildren(name);

  if (!query || !isMatch) {
    return;
  }

  const matchStart = normalizeForSearch(name).indexOf(query);
  const mark = document.createElement('mark');

  mark.textContent = name.slice(matchStart, matchStart + query.length);
  nameElement.replaceChildren(
    name.slice(0, matchStart),
    mark,
    name.slice(matchStart + query.length),
  );
}

function clearSearch() {
  filterInput.value = '';
  filterNames();
  filterInput.focus();
}

function focusSearchWithShortcut(event) {
  const target = event.target;
  const isTyping = target.matches('input, textarea, select, [contenteditable="true"]');

  if (event.key === '/' && !isTyping && !event.metaKey && !event.ctrlKey && !event.altKey) {
    event.preventDefault();
    filterInput.focus();
  }
}

function toggleFavoritesOnly() {
  showFavoritesOnly = !showFavoritesOnly;
  updateFavoritesFilterButton();
  filterNames();
}

function updateFavoritesFilterButton() {
  favoritesOnlyButton.setAttribute('aria-pressed', String(showFavoritesOnly));
  favoritesOnlyButton.textContent = showFavoritesOnly ? 'Show all' : 'Favorites';
}

function updateSearchUrl(query) {
  const url = new URL(window.location.href);

  if (query) {
    url.searchParams.set('q', filterInput.value.trim());
  } else {
    url.searchParams.delete('q');
  }

  if (showFavoritesOnly) {
    url.searchParams.set('favorites', '1');
  } else {
    url.searchParams.delete('favorites');
  }

  window.history.replaceState({}, '', url);
}

function restoreSearchFromUrl() {
  const params = new URLSearchParams(window.location.search);

  filterInput.value = params.get('q') ?? '';
  showFavoritesOnly = params.get('favorites') === '1';
  updateFavoritesFilterButton();
  filterNames(false);
}
