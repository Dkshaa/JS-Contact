# Mini Contact App

A small, dependency-free contact directory built with HTML and JavaScript. It
demonstrates DOM selection, event handling, and live filtering while Materialize
provides the page styling.

## Features

- Filters contacts as you type
- Sorts contact sections and the names within them alphabetically
- Toggles the contact directory between A–Z and Z–A order
- Toggles sort order from the keyboard with `Alt+S`
- Groups accented names by their base letter and other names under `#`
- Matches names without case sensitivity
- Matches names even when accent marks are omitted
- Prevents duplicate contacts that differ only by case or accent marks
- Highlights the matching part of each visible name
- Announces the number of visible results as the search changes
- Shows filtered result counts in the browser tab title
- Saves contacts added in the browser for future visits
- Shows a live character count while entering contact names
- Normalizes saved names and safely ignores malformed browser data
- Self-heals browser storage by removing unsafe or accent-equivalent duplicates
- Rejects invisible control characters in contact names
- Allows saved contacts to be renamed and automatically regrouped
- Lets users cancel a rename with the Cancel button or `Escape` key
- Clears an unfinished new-contact entry with `Escape`
- Lets users remove contacts they added without changing the built-in directory
- Restores the most recently removed custom contact with a one-click undo
- Discards stale undo actions after clearing or restoring saved data
- Lets users mark built-in or custom contacts as favorites
- Announces favorite changes through an accessible live status
- Remembers favorite contacts between browser visits
- Recovers saved favorites even when stored name capitalization differs
- Self-heals saved favorites with accent-aware matching and unsafe-data removal
- Displays the current favorite count in the Favorites filter
- Filters the directory to favorite contacts while preserving shareable URLs
- Toggles the favorites filter from the keyboard with `Alt+F`
- Downloads custom contacts and favorites as a portable JSON backup
- Sorts exported backup names consistently for stable, readable files
- Shows the number of custom contacts currently saved
- Restores validated JSON backups without duplicating built-in contacts
- Applies control-character and accent-aware duplicate checks to restored backups
- Rejects backup uploads larger than 1 MB
- Clears saved contacts and favorites through an explicit confirmation step
- Disables the clear-saved-data action when no browser data exists
- Clears favorites separately without deleting custom contacts
- Disables the clear-favorites action when there is nothing to clear
- Hides alphabetic sections that have no matching contacts
- Displays a clear message when no contacts match
- Offers a one-click filter reset when no contacts match
- Adapts the layout for phones, tablets, and desktop screens
- Clears a search with either the Clear button or the Escape key
- Synchronizes native browser search-field clear controls
- Stores the current search in the URL so filtered views can be bookmarked or shared
- Limits search and shared-URL queries to 60 characters
- Preserves descending sort order in bookmarked and shared URLs
- Copies the current filtered view as a shareable link
- Falls back to legacy clipboard support when the modern API is unavailable
- Recovers with the clipboard fallback when modern copy permission is denied
- Clears copied-link confirmation when the shared filters become outdated
- Dismisses copied-link confirmation with `Escape`
- Focuses search from anywhere on the page with the `/` keyboard shortcut

## Run locally

Clone the repository and open `index.html` in a browser. No build step or package
installation is required.

## Run tests

Install the development dependencies and browser once, then run the automated
browser tests:

```bash
npm install
npx playwright install chromium
npm test
```

GitHub Actions also runs this suite automatically for pull requests and pushes to
`main`.

## Using the search

Start typing a name in the search field and the contact groups update immediately.
Choose **Clear** to restore the full directory. Keyboard users can press `Escape`
while the search field is focused to clear the current query without leaving the
keyboard, or press `/` from elsewhere on the page to focus the search field.

The page URL updates with a `q` parameter while filtering. Opening a shared URL,
such as `index.html?q=chris`, restores that search automatically.

The Clear button is disabled when there is no active query, and visible focus
styles make keyboard navigation easier to follow.

## Project files

- `index.html` contains the contact list and search interface.
- `script.js` contains the filtering behavior.
- `styles.css` contains the responsive layout and focus styles.
- `BACKUP_FORMAT.md` documents the portable backup schema and validation rules.

See [Backup format](./BACKUP_FORMAT.md) before generating or editing backup files
outside the app.
