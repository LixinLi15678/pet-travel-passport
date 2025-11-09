# Firebase Database Schema (2025-11)

The Pet Travel Passport app now uses three Firestore collections:

1. `files` – every uploaded document (PDF/image) stored as a base64 payload plus metadata. Files are grouped per pet through the `petId` field.
2. `userProgress` – one document per user that keeps UI state (current step, selected pet profile, list of pets, review status, etc.). This lets users leave the site and come back later without losing progress.
3. `breeders` – one document per user that stores long‑lived pet metadata (names, creation dates) plus lightweight indexes of file IDs for each pet. This mirrors the UI’s “Pets” modal and lets future features look up files per pet without scanning the entire `files` collection.

> **Note:** Firebase Storage is not used. All file data lives directly inside Firestore documents so the UI can work offline via localStorage caching.

---

## `files` Collection

**Document path**: `files/{userId}_{fileId}`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | string | Yes | File identifier generated on upload (`{timestamp}_{sanitizedName}`) |
| `userId` | string | Yes | Firebase Auth UID of the owner |
| `petId` | string | Yes | Pet profile this file belongs to (`pet_default` or custom `pet_{timestamp}`) |
| `category` | string | Yes | Upload category (`"vaccine"` at the moment) |
| `name` | string | Yes | Original filename |
| `size` | number | Yes | Byte size of the file before base64 encoding |
| `type` | string | Yes | MIME type (e.g., `application/pdf`, `image/jpeg`) |
| `uploadedAt` | string (ISO 8601) | Yes | Timestamp set by the client when the file is saved |
| `data` | string | Yes | Base64 data URL for the file (prefixed with `data:...;base64,`) |
| `source` | string | No | Indicates where the cached copy originated (`"firestore"` or `"local"`) |

### Example `files` document

```json
{
  "id": "1762665970545_passport.pdf",
  "userId": "HvnvmsGpdvXrGfGYT3w6yqtP8vD2",
  "petId": "pet_1731105600000",
  "category": "vaccine",
  "name": "passport.pdf",
  "size": 482221,
  "type": "application/pdf",
  "uploadedAt": "2025-11-09T05:58:00.000Z",
  "data": "data:application/pdf;base64,JVBERi0xLjcKJc...",
  "source": "firestore"
}
```

Pet display labels in the UI follow the **first upload date + pet name** rule (e.g., `2025-11-09 Mochi`).

---

## `userProgress` Collection

**Document path**: `userProgress/{userId}`

Each document stores the current wizard step, which pet profile is active, and the list of all pets created by the user. The app also keeps lightweight stats (`lastFileIds`, `lastFileCount`) so it can quickly rebuild UI state without scanning the `files` collection each time.

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `currentStep` | string | Yes | Current wizard step (`"main"`, `"vaccine"`, etc.) |
| `activePetId` | string | Yes | Pet profile currently selected in the UI |
| `pets` | array | Yes | List of pet profile metadata (see below) |
| `lastFileIds` | array of strings | No | Snapshot of the most recent file IDs for the active pet |
| `lastFileCount` | number | No | Convenience count of `lastFileIds` |
| `reviewReady` | boolean | No | Flag the UI sets after the user clicks “Continue to Review” |
| `lastUpdated` | string (ISO 8601) | Yes | Timestamp when the document was last written |

### Pet objects inside `pets`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | string | Yes | Unique pet identifier (`pet_{timestamp}`) |
| `name` | string | No | User-provided pet name (required for new profiles, optional for legacy ones) |
| `createdAt` | string (ISO 8601) | Yes | When the profile was created (or when the first file arrived) |

### Example `userProgress` document

```json
{
  "currentStep": "vaccine",
  "activePetId": "pet_1731105600000",
  "pets": [
    {
      "id": "pet_1731105600000",
      "name": "Mochi",
      "createdAt": "2025-11-09T05:50:00.000Z"
    },
    {
      "id": "pet_1731020000000",
      "name": "Nori",
      "createdAt": "2025-11-08T01:15:00.000Z"
    }
  ],
  "lastFileIds": [
    "1762665970545_passport.pdf",
    "1762666000000_vet-letter.jpg"
  ],
  "lastFileCount": 2,
  "reviewReady": true,
  "lastUpdated": "2025-11-09T06:10:00.000Z"
}
```

---

## Relationships & Notes

- Every document in `files` references exactly one pet via `petId`. Multiple pets simply mean multiple `petId` values for the same `userId`.
- The UI’s **Pets** modal reads `userProgress/{uid}` to list pets, syncs pet names to `breeders/{uid}`, and then groups `files` client-side to show the documents per pet.
- Because files are stored base64-encoded inside Firestore, keep an eye on document size limits (1 MiB). The frontend compresses images before upload and stores only small PDFs to stay within limits.
- Local caching mirrors this schema: keys are built as `pet_passport_files_{userId}_{petId}_{fileId}` so offline mode can restore each pet’s files independently.

---

## `breeders` Collection

**Document path**: `breeders/{userId}`

This document is the authoritative list of pets for a user plus a lightweight per‑pet file index. It is updated whenever the user adds, deletes, or uploads files for a pet.

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `userId` | string | Yes | Firebase Auth UID of the owner |
| `pets` | array | Yes | List of pet objects (below) |
| `updatedAt` | string (ISO 8601) | Yes | Timestamp of the latest update |

### Pet object inside `breeders`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | string | Yes | Pet identifier (`pet_{timestamp}` or legacy `pet_default`) |
| `name` | string | Yes | User-entered pet name |
| `createdAt` | string (ISO 8601) | No | When the profile was created |
| `files` | array | Yes | Array of file summaries belonging to the pet |

Each entry in `files` contains:

| Field | Type | Description |
| --- | --- | --- |
| `fileId` | string | ID that matches a document in the `files` collection |
| `name` | string | Original filename |
| `uploadedAt` | string (ISO 8601) | When the file was uploaded |
| `type` | string | MIME type |
| `size` | number | Size in bytes |

### Example `breeders` document

```json
{
  "userId": "HvnvmsGpdvXrGfGYT3w6yqtP8vD2",
  "updatedAt": "2025-11-09T06:15:00.000Z",
  "pets": [
    {
      "id": "pet_1731105600000",
      "name": "Mochi",
      "createdAt": "2025-11-09T05:50:00.000Z",
      "files": [
        {
          "fileId": "1762665970545_passport.pdf",
          "name": "passport.pdf",
          "uploadedAt": "2025-11-09T05:58:00.000Z",
          "type": "application/pdf",
          "size": 482221
        }
      ]
    },
    {
      "id": "pet_1731020000000",
      "name": "Nori",
      "createdAt": "2025-11-08T01:15:00.000Z",
      "files": []
    }
  ]
}
```

This schema should be provisioned before deploying the updated frontend so that every user can create multiple pets, switch profiles, and keep their uploaded vaccine files separated per pet.
