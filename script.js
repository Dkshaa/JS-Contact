const filterInput = document.getElementById('filterInput');
const clearFilter = document.getElementById('clearFilter');
const contactList = document.getElementById('names');
const noResults = document.getElementById('noResults');

filterInput.addEventListener('input', () => filterNames());
filterInput.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && filterInput.value) {
    clearSearch();
  }
});
clearFilter.addEventListener('click', clearSearch);
window.addEventListener('popstate', restoreSearchFromUrl);

sortContactSections();
restoreSearchFromUrl();

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
    const name = contact.textContent.trim().toLocaleLowerCase();
    const isMatch = name.includes(query);

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

  noResults.hidden = visibleCount !== 0;
  clearFilter.disabled = query.length === 0;

  if (syncUrl) {
    updateSearchUrl(query);
  }
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
