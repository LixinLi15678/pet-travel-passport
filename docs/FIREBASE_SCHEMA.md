# Firebase Database Schema Documentation

## Overview

This document describes the Firebase Firestore database schema for the Pet Travel Passport application. The database uses a user-centric structure where all passport data for each user is stored in a single document.

## Collection Structure

```
users (collection)
  └── {userId} (document)
       ├── userId: string
       ├── passports: array
       └── updatedAt: timestamp
```

## Data Models

### Root Document: `users/{userId}`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `userId` | string | Yes | Unique identifier for the user (Firebase Auth UID) |
| `passports` | array | Yes | Array of passport objects belonging to this user |
| `updatedAt` | string (ISO 8601) | Yes | Last update timestamp for this user's data |

### Passport Object

Each passport object in the `passports` array contains the following structure:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `passportId` | string | Yes | Unique identifier for this passport |
| `createdAt` | string (ISO 8601) | Yes | Timestamp when the passport was created |
| `updatedAt` | string (ISO 8601) | Yes | Timestamp when the passport was last updated |
| `carrier` | object | No | Information about the pet carrier |
| `pet` | object | No | Information about the pet |
| `vaccine` | object | No | Information about vaccination records |
| `flight` | object | No | Information about the flight |

### Carrier Object

Contains dimensions and weight of the pet carrier.

| Field | Type | Required | Unit | Description |
|-------|------|----------|------|-------------|
| `length` | number | Yes | inch | Length of the carrier in inches |
| `width` | number | Yes | inch | Width of the carrier in inches |
| `height` | number | Yes | inch | Height of the carrier in inches |
| `weight` | number | Yes | lb | Weight of the carrier in pounds |

**Example:**
```json
{
  "length": 18,
  "width": 12,
  "height": 12,
  "weight": 5.5
}
```

### Pet Object

Contains weight information about the pet.

| Field | Type | Required | Unit | Description |
|-------|------|----------|------|-------------|
| `weight` | number | Yes | lb | Weight of the pet in pounds |
| `totalWeight` | number | Yes | lb | Combined weight of pet and carrier |

**Example:**
```json
{
  "weight": 11.5,
  "totalWeight": 17.0
}
```

**Note:** `totalWeight` should equal `pet.weight + carrier.weight`

### Vaccine Object

Contains references to vaccination documents stored in Firebase Storage.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `fileReferences` | array | Yes | Array of file reference objects |

#### File Reference Object

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `fileId` | string | Yes | Unique identifier for the file |
| `fileName` | string | Yes | Original name of the uploaded file |
| `fileSize` | number | Yes | Size of the file in bytes |
| `fileType` | string | Yes | MIME type of the file (e.g., "image/jpeg", "application/pdf") |
| `uploadedAt` | string (ISO 8601) | Yes | Timestamp when the file was uploaded |
| `storagePath` | string | Yes | Path to the file in Firebase Storage |

**Example:**
```json
{
  "fileReferences": [
    {
      "fileId": "file_1699123456789_abc123",
      "fileName": "rabies_vaccine.pdf",
      "fileSize": 524288,
      "fileType": "application/pdf",
      "uploadedAt": "2024-01-15T10:30:00.000Z",
      "storagePath": "users/uid123/vaccine/file_1699123456789_abc123.pdf"
    },
    {
      "fileId": "file_1699123457890_def456",
      "fileName": "health_certificate.jpg",
      "fileSize": 1048576,
      "fileType": "image/jpeg",
      "uploadedAt": "2024-01-15T10:31:00.000Z",
      "storagePath": "users/uid123/vaccine/file_1699123457890_def456.jpg"
    }
  ]
}
```

**Important Notes:**
- File references are stored in Firestore, not the actual file data
- Actual files are stored in Firebase Storage at the path specified in `storagePath`
- Base64 data is NOT stored in Firestore to keep document size small
- Multiple files can be uploaded for a single passport

### Flight Object

Contains information about the flight booking.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `pnr` | string | Yes | Passenger Name Record (booking reference) |
| `flightNumber` | string | Yes | Flight number (e.g., "UA123") |
| `flightDate` | string (ISO 8601) | Yes | Date and time of the flight |

**Example:**
```json
{
  "pnr" | "ABC123",
  "flightNumber": "UA123",
  "flightDate": "2024-02-20T14:30:00.000Z"
}
```

## Complete Example Document

```json
{
  "userId": "firebase_auth_uid_123",
  "updatedAt": "2024-01-15T12:00:00.000Z",
  "passports": [
    {
      "passportId": "passport_1699123456789_xyz789",
      "createdAt": "2024-01-15T09:00:00.000Z",
      "updatedAt": "2024-01-15T12:00:00.000Z",
      "carrier": {
        "length": 18,
        "width": 12,
        "height": 12,
        "weight": 5.5
      },
      "pet": {
        "weight": 11.5,
        "totalWeight": 17.0
      },
      "vaccine": {
        "fileReferences": [
          {
            "fileId": "file_1699123456789_abc123",
            "fileName": "rabies_vaccine.pdf",
            "fileSize": 524288,
            "fileType": "application/pdf",
            "uploadedAt": "2024-01-15T10:30:00.000Z",
            "storagePath": "users/uid123/vaccine/file_1699123456789_abc123.pdf"
          }
        ]
      },
      "flight": {
        "pnr": "ABC123",
        "flightNumber": "UA123",
        "flightDate": "2024-02-20T14:30:00.000Z"
      }
    }
  ]
}
```

## Firebase Storage Structure

Vaccine files are stored in Firebase Storage with the following path structure:

```
users/
  └── {userId}/
       └── vaccine/
            ├── file_{timestamp}_{id}.pdf
            ├── file_{timestamp}_{id}.jpg
            └── file_{timestamp}_{id}.png
```

**Example paths:**
- `users/uid123/vaccine/file_1699123456789_abc123.pdf`
- `users/uid123/vaccine/file_1699123457890_def456.jpg`

## Data Types and Formats

### String (ISO 8601 Timestamp)
All timestamps use ISO 8601 format: `YYYY-MM-DDTHH:mm:ss.sssZ`
- Example: `"2024-01-15T10:30:00.000Z"`

### Number
All numeric values are stored as JavaScript numbers
- Weights: stored in pounds (lb)
- Dimensions: stored in inches (inch)
- File sizes: stored in bytes

### String (File Path)
Storage paths use forward slashes: `users/{userId}/vaccine/{filename}`

## Best Practices

### 1. Data Validation
- Always validate data before writing to Firestore
- Ensure `totalWeight = pet.weight + carrier.weight`
- Validate file types and sizes before upload
- Check for required fields

### 2. File Management
- Delete files from Storage when removing passport
- Keep fileReferences synchronized with Storage
- Implement proper error handling for file operations

### 3. Security Rules
Recommended Firestore security rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

Recommended Storage security rules:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /users/{userId}/{allPaths=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

### 4. Performance Optimization
- Use localStorage as backup for offline access
- Implement pagination for large passport lists
- Cache frequently accessed data
- Use batch operations for multiple updates

### 5. Data Migration
When migrating from old structure:
- Convert pet data from array to passport objects
- Migrate file data to Storage
- Create fileReferences for existing files
- Update timestamps to ISO 8601 format

## Firebase Usage Examples

**Note:** As of v2.1.1, the application uses direct Firebase operations instead of a service layer for simplicity.

### Upload Vaccine File to Storage
```javascript
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from './firebase/config';

const uploadVaccineFile = async (userId, file, onProgress) => {
  const fileId = `file_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const fileName = `${fileId}_${file.name}`;
  const storageRef = ref(storage, `users/${userId}/vaccine/${fileName}`);

  const uploadTask = uploadBytesResumable(storageRef, file);

  return new Promise((resolve, reject) => {
    uploadTask.on('state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        onProgress?.(progress);
      },
      (error) => reject(error),
      async () => {
        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
        resolve({
          fileId,
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          uploadedAt: new Date().toISOString(),
          storagePath: uploadTask.snapshot.ref.fullPath,
          downloadURL
        });
      }
    );
  });
};
```

### Delete File from Storage
```javascript
import { ref, deleteObject } from 'firebase/storage';
import { storage } from './firebase/config';

const deleteVaccineFile = async (storagePath) => {
  const fileRef = ref(storage, storagePath);
  await deleteObject(fileRef);
};
```

### Save Passport Data to Firestore (Optional)
```javascript
import { doc, setDoc } from 'firebase/firestore';
import { db } from './firebase/config';

const savePassportData = async (userId, passportData) => {
  const userDocRef = doc(db, 'users', userId);
  await setDoc(userDocRef, {
    passports: [passportData],
    updatedAt: new Date().toISOString()
  }, { merge: true });
};
```

### Load Passport Data from Firestore
```javascript
import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebase/config';

const loadPassportData = async (userId) => {
  const userDocRef = doc(db, 'users', userId);
  const docSnap = await getDoc(userDocRef);

  if (docSnap.exists()) {
    return docSnap.data();
  }
  return null;
};
```

## Error Handling

All service methods return Promises and handle errors gracefully:
- Firestore errors fallback to localStorage
- File upload errors are caught and reported
- Network errors are handled with retry logic

## Changelog

### Version 2.0 (Current)
- Introduced new passport-centric data structure
- Separated file references from file data
- Added support for multiple passports per user
- Improved data organization and scalability

### Version 1.0 (Legacy)
- Simple array-based pet storage
- Base64 encoded files in Firestore
- Limited to single passport type

## Support

For questions or issues regarding the database schema:
1. Check this documentation first
2. Review the `passportService.js` implementation
3. Consult Firebase Firestore documentation
4. Contact the development team
