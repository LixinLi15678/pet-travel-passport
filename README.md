# Pet Travel Passport

A mobile-friendly web application for pet travel passport generation.

## Core Features

**Data Persistence**: Firebase Firestore + localStorage fallback

**Multi-File Upload**: Files stored as base64 in Firestore

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Configure Firebase
```bash
cp .env.example .env.local
```
Edit .env.local with your Firebase config

### 3. Configure local env
a. open https://console.firebase.google.com/

b. Choose "Pet Travel Passport"

c. Go to ⚙️ -> Project settings
   - Scroll to "PTP"
   - Copy `firebaseConfig` to your .env.local

### 4. Run
```bash
npm start
```

## 🛠️ Tech Stack

React 18 • Firebase Firestore (no Storage) • HTML5 File API

---
**Last Updated**: 2025-11-05