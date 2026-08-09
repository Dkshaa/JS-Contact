const filterInput = document.getElementById('filterInput');
const clearFilter = document.getElementById('clearFilter');
const addContactForm = document.getElementById('addContactForm');
const contactNameInput = document.getElementById('contactName');
const addContactStatus = document.getElementById('addContactStatus');
const contactList = document.getElementById('names');
const searchStatus = document.getElementById('searchStatus');
const customContactsKey = 'mini-contact-app.custom-contacts';

addContactForm.addEventListener('submit', handleAddContact);
filterInput.addEventListener('input', () => filterNames());
filterInput.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && filterInput.value) {
    clearSearch();
  }
});
clearFilter.addEventListener('click', clearSearch);
window.addEventListener('popstate', restoreSearchFromUrl);

loadSavedContacts();
sortContactSections();
restoreSearchFromUrl();

function handleAddContact(event) {
  event.preventDefault();

  const name = contactNameInput.value.trim().replace(/\s+/g, ' ');
  const isDuplicate = [...contactList.querySelectorAll('.contact-name')].some(
    (contact) => contact.textContent.trim().toLocaleLowerCase() === name.toLocaleLowerCase(),
  );

  if (!name) {
    addContactStatus.textContent = 'Enter a contact name.';
    return;
  }

  if (isDuplicate) {
    addContactStatus.textContent = `${name} is already in the contact list.`;
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
  const removeButton = document.createElement('button');

  contact.className = 'collection-item';
  contact.dataset.custom = 'true';
  nameElement.className = 'contact-name';
  nameElement.textContent = name;
  removeButton.className = 'btn-flat remove-contact';
  removeButton.type = 'button';
  removeButton.textContent = 'Remove';
  removeButton.setAttribute('aria-label', `Remove ${name}`);
  removeButton.addEventListener('click', removeCustomContact);
  contact.append(nameElement, removeButton);
  header.after(contact);

  sortContactSections();
  filterNames();

  if (persist) {
    saveCustomContacts();
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

function removeCustomContact(event) {
  const contact = event.currentTarget.closest('[data-custom="true"]');
  const name = contact.querySelector('.contact-name').dataset.name;
  let header = contact.previousElementSibling;

  while (header && !header.classList.contains('collection-header')) {
    header = header.previousElementSibling;
  }

  contact.remove();

  if (header && (!header.nextElementSibling || header.nextElementSibling.matches('.collection-header'))) {
    header.remove();
  }

  saveCustomContacts();
  filterNames();
  addContactStatus.textContent = `${name} was removed.`;
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
  const headers = contactList.querySelectorAll('.collection-header');

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
}

function filterNames(syncUrl = true) {
  const query = filterInput.value.trim().toLocaleLowerCase();
  const contacts = contactList.querySelectorAll('.collection-item');
  const headers = contactList.querySelectorAll('.collection-header');
  let visibleCount = 0;

  contacts.forEach((contact) => {
    const nameElement = contact.querySelector('.contact-name');
    const originalName = nameElement.dataset.name ?? nameElement.textContent.trim();
    const normalizedName = originalName.toLocaleLowerCase();
    const isMatch = normalizedName.includes(query);

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

  searchStatus.textContent = query
    ? `${visibleCount} contact${visibleCount === 1 ? '' : 's'} found.`
    : `Showing all ${visibleCount} contacts.`;
  clearFilter.disabled = query.length === 0;

  if (syncUrl) {
    updateSearchUrl(query);
  }
}

function renderMatch(nameElement, name, query, isMatch) {
  nameElement.replaceChildren(name);

  if (!query || !isMatch) {
    return;
  }

  const matchStart = name.toLocaleLowerCase().indexOf(query);
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

function updateSearchUrl(query) {
  const url = new URL(window.location.href);

  if (query) {
    url.searchParams.set('q', filterInput.value.trim());
  } else {
    url.searchParams.delete('q');
  }

  window.history.replaceState({}, '', url);
}

function restoreSearchFromUrl() {
  const params = new URLSearchParams(window.location.search);

  filterInput.value = params.get('q') ?? '';
  filterNames(false);
}
