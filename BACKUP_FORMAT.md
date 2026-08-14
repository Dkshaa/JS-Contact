# Contact backup format

The Mini Contact App exports UTF-8 JSON files that can be restored from the
**Backup and restore** panel. Backups contain only contacts added in the browser
and favorite names; the built-in directory is already part of the app.

## Version 1 schema

```json
{
  "version": 1,
  "exportedAt": "2026-08-14T12:00:00.000Z",
  "customContacts": ["Maria", "Zara"],
  "favorites": ["Anna", "Maria"]
}
```

| Field | Required | Description |
| --- | --- | --- |
| `version` | Yes | Must be the number `1`. |
| `exportedAt` | Exported only | ISO 8601 timestamp describing when the file was created. |
| `customContacts` | Yes | Array of custom contact-name strings. |
| `favorites` | Yes | Array of built-in or custom contact-name strings. |

## Validation and restore behavior

- Contact names are trimmed, repeated whitespace is collapsed, and names longer
  than 60 characters are rejected.
- Duplicate names are compared without case sensitivity and reduced to one entry.
- A custom contact that duplicates a built-in contact is not added again.
- Favorite names that do not exist after restoration are ignored.
- A valid restore replaces current custom contacts and favorite selections.
- Invalid JSON or unsupported versions do not change current data.

## Privacy

Backups are created locally in the browser. The app does not upload contact data,
but exported files should still be stored and shared with the same care as any
other personal contact list.
