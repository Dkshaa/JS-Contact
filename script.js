const filterInput = document.getElementById('filterInput');
const searchStatus = document.getElementById('searchStatus');

filterInput.addEventListener('input', filterNames);

function filterNames() {
    const filterValue = filterInput.value.toUpperCase();
    const namesList = document.getElementById('names');
    const contactItems = namesList.querySelectorAll('li.collection-item');
    let visibleCount = 0;

    contactItems.forEach((item) => {
        const contactLink = item.getElementsByTagName('a')[0];
        const isMatch = contactLink.textContent.toUpperCase().includes(filterValue);

        item.style.display = isMatch ? '' : 'none';

        if (isMatch) {
            visibleCount += 1;
        }
    });

    searchStatus.textContent = filterValue
        ? `${visibleCount} contact${visibleCount === 1 ? '' : 's'} found.`
        : 'Showing all contacts.';
}
