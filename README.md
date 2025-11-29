# Pet Travel Passport
[![Deploy to GitHub Pages](https://github.com/LixinLi15678/pet-travel-passport/actions/workflows/deploy.yml/badge.svg)](https://github.com/LixinLi15678/pet-travel-passport/actions/workflows/deploy.yml)
[![Website](https://img.shields.io/website?url=https%3A%2F%2FLixinLi15678.github.io%2Fpet-travel-passport)](https://LixinLi15678.github.io/pet-travel-passport)

A mobile-first wizard for collecting the measurements, documents, and approvals airlines request before accepting pets for travel. Users authenticate with Firebase Email/Password, create multiple pet profiles, and upload signed vaccine PDFs or photos that are stored as base64 blobs in Firestore with a localStorage fallback for offline work.

**License: CC BY-NC 4.0 — Commercial use is prohibited.**

## Table of Contents
- [Pet Travel Passport](#pet-travel-passport)
  - [Table of Contents](#table-of-contents)
  - [Overview](#overview)
  - [Feature Highlights](#feature-highlights)
  - [Architecture](#architecture)
  - [Data Model](#data-model)
  - [Quick Start](#quick-start)
  - [Development Workflow](#development-workflow)
  - [Environment Variables](#environment-variables)
  - [Firebase Setup Checklist](#firebase-setup-checklist)
  - [Build \& Deployment](#build--deployment)
  - [Admin Console (personal tooling)](#admin-console-personal-tooling)
  - [Troubleshooting](#troubleshooting)
  - [Resources](#resources)
  - [Attribution](#attribution)
  - [License](#license)

## Overview
The Pet Travel Passport flow mirrors the hand-off an airline agent expects:
1. **Auth & Project Setup** – Users sign in, review the wizard status bar, and understand how to log out via the cat icon.
2. **Measure** – Capture carrier dimensions with live validation (18″ × 11″ × 11″ ceiling) and auto-save them per pet.
3. **Weight** – Record carrier weight and pet weight and auto-save and validate them per pet.
4. **Vaccine** – Upload PDF/image proof, drag files to reorder, preview PDFs in-line via `react-pdf`, and compress photos before persisting.
5. **Review** – Stored files and dimensions feed the eventual “Done” screen plus future PDF exports/QR codes.

## Feature Highlights
- **Guided multi-step wizard** that prevents moving forward without a pet profile and enforces measurement limits.
- **Per-pet workspaces** using the `Pets` modal with add/delete/switch actions and automatic labeling (`YYYY-MM-DD PetName`).
- **Local-first persistence** via `userProgressService` and `fileUploadService`. Firestore syncs when credentials exist; otherwise localStorage keeps progress.
- **Document ingestion pipeline** with drag-and-drop, bulk upload, serverless compression, PDF paging/zoom, and inline validation (size/MIME).
- **Accessibility & resiliency**: keyboard focus management in Auth screens, offline-friendly caching, and informative error states.
- **Weight capture & validation**: a Weight step for recording carrier and pet weight with per-pet persistence and automatic sync via `userProgressService`.

## Architecture
- **React 18 + CRA (TypeScript)**: `App.tsx` is the typed state machine that swaps between `main`, `measure`, `weight`, and `vaccine`, wires Firebase auth, and hands strictly typed callbacks into each step component.
- **Feature components**: `Auth.tsx`, `MainPage.tsx`, `Measure.tsx`, `WeightCarrier.tsx`, `WeightTotal.tsx`, `Vaccine.tsx`, and `PetsModal.tsx` encapsulate UI logic while sharing `PetProfile`, `PetDimensions`, and `FileInfo` types from `src/types/index.ts`.
- **Services layer**:  
  - `userProgressService.ts` (wizard state, dimensions, pets)  
  - `fileUploadService.ts` (base64 upload + cache + Firestore)  
  - `breederService.ts` (denormalized view for admin/export tooling)
- **Storage strategy**: Files are capped at Firestore’s 1 MiB limit, stored both remotely and in localStorage (`pet_passport_files_{uid}_{petId}_{fileId}`) for offline replay.
- **Shared types & config**: `tsconfig.json` enforces `strict` + `noEmit`, while `src/firebase/config.ts` centralizes Firebase initialization so services/components stay framework-agnostic.
- **Utilities**: `utils/imageCompression.ts` downsizes images before saving; `react-pdf` + `pdfjs-dist` render previews directly in-browser.

```
[Auth] ──▶ [App Shell] ──▶ { MainPage | Measure | Weight | Vaccine }
                    │
                    ├─ userProgressService ──▶ Firestore: userProgress
                    ├─ fileUploadService  ──▶ Firestore: files + localStorage cache
                    └─ breederService     ──▶ Firestore: breeders snapshot
```

## Data Model
See `docs/FIREBASE_SCHEMA.md` for the full schema. Quick reference:

| Collection | Purpose | Key Fields |
| --- | --- | --- |
| `userProgress/{userId}` | Wizard UI state + pet list + active pet pointer | `currentStep`, `activePetId`, `pets[]` (with `dimensions`/`weight`/`flight`), `lastFileIds`, `reviewReady`, `lastUpdated` |
| `files/{userId}_{fileId}` | Each uploaded PDF/image stored directly as base64 | `petId`, `category`, `name`, `size`, `type`, `uploadedAt`, `data`, `source` |
| `breeders/{userId}` | Denormalized pet roster + lightweight file index | `pets[].files[]`, `updatedAt`, `userId` |

## Quick Start

To use firebase feature, you need to create a project on firebase. Or you can use our website to create a passport.

1. **Clone & install**
   ```bash
   git clone https://github.com/LixinLi15678/pet-travel-passport.git
   cd pet-travel-passport
   npm install
   ```
2. **Configure Firebase**
   ```bash
   cp .env.example .env.local
   ```
   Fill `.env.local` with your Firebase web app keys.

   (a) Go to: https://console.firebase.google.com/project/pet-travel-passport/settings/general/

   (b) You can find all information you need in "PTP" Webapp.

3. **Run the dev server**
   ```bash
   npm start
   ```
4. **Type-check (optional)**
   ```bash
   npx tsc --noEmit
   ```

## Development Workflow

| Command | Description |
| --- | --- |
| `npm start` | CRA dev server with TypeScript overlays and HMR. |
| `npx tsc --noEmit` | Standalone type-check using `tsconfig.json`’s strict rules. |
| `npm run build` | Production build (includes a type-check phase) into `build/`. |

**Must run `npm run build` before push to GitHub**

## Environment Variables

| Variable | Description |
| --- | --- |
| `REACT_APP_FIREBASE_API_KEY` | Firebase Web API key |
| `REACT_APP_FIREBASE_AUTH_DOMAIN` | Auth domain, e.g. `your-project.firebaseapp.com` |
| `REACT_APP_FIREBASE_PROJECT_ID` | Firestore project ID |
| `REACT_APP_FIREBASE_STORAGE_BUCKET` | Storage bucket (kept for parity even though Firestore stores files) |
| `REACT_APP_FIREBASE_MESSAGING_SENDER_ID` | Sender ID from project settings |
| `REACT_APP_FIREBASE_APP_ID` | App ID from the Firebase web app |

Missing any of the above simply disables Firebase usage and keeps everything in localStorage for experimentation.

## Firebase Setup Checklist
1. **Create a Firebase project** (console.firebase.google.com) and add a Web App named `PTP`.
2. **Enable Email/Password authentication** under *Build → Authentication → Sign-in method*.
3. **Create a Firestore database** in production mode. No indexes are required yet.
4. **Download your config** from *Project Settings → General → Your apps* and copy the values into `.env.local`.
5. **(Optional) Rules** – lock the database to authenticated users:
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /{document=**} {
         allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
       }
     }
   }
   ```
6. **Deploy**: once the Firebase console shows healthy collections (`userProgress`, `files`, `breeders`), run `npm run build`.

## Build & Deployment
- `npm run build` – Production build in `build/`.
- `npm run deploy` – Publishes the `build/` folder to GitHub Pages via `gh-pages`.
- The repository already ships with a `deploy.yml` GitHub Action badge (top of this README). Update `package.json#homepage` if you fork under a different user/org.

## Admin Console (personal tooling)
For my own testing I keep a standalone console (`public/admin-console.html`) that shares the same Firebase project. It lets me inspect `userProgress/files` and sync Auth accounts via `npm run sync-auth-users`. This tool isn’t required for the main workflow. (Lixin)

## Troubleshooting
- **“Firebase configuration incomplete - using local storage fallback”** – Double-check `.env.local`. This warning is expected in offline demo mode.
- **`auth/configuration-not-found`** – Enable Email/Password sign-in in Firebase Authentication.
- **Blank PDF preview** – PDFs must be served from the same origin. Use `npm start` instead of opening the `build` folder directly.
- **`File exceeds size limit`** – Firestore limits documents to 1 MiB. Compress the source PDF/image or split large uploads.

## Resources
- `docs/FIREBASE_SCHEMA.md` – Detailed description of every field stored in Firestore.

## Attribution
- Claude help refactor code from `js` to `tsx`

## License
Creative Commons Attribution-NonCommercial 4.0 International (CC BY-NC 4.0). Commercial use is prohibited.

---
**Last Updated**: 2025-11-11
