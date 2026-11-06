# Peak Stoneworkz Boards

A Kanban / Jira-style board for Peak Stoneworkz, built with React + Vite + TypeScript, Tailwind, dnd-kit and Firebase (Auth, Firestore, Hosting).

## Features
- Email + password sign-in with email verification and password reset (optionally limited to your company domain)
- Projects with members (invite by email)
- Multiple boards per project (e.g. Sales, Fabrication, Installations), each with its own columns and WIP limits; move cards between boards
- Blocked flag with a reason: red marker on the card, per-column blocked count, and a "Blocked" filter
- Drag-and-drop cards between and within columns (mouse, touch, keyboard)
- Real-time sync: everyone sees moves and edits instantly
- Card numbers (`RI-12`), priority, assignee, due date, labels, job/inventory reference, comments
- Search and assignee filter
- Shareable card links (`/p/<project>?card=<id>`)
- Offline cache (keeps working on spotty Wi-Fi, syncs when back online)

## Run locally (no Firebase project needed)
Requires Node 20+ and Java 11+ (for the emulators).

```bash
npm install
cp .env.example .env.local     # then set VITE_USE_EMULATORS=true
npm run emulators              # terminal 1: Auth + Firestore emulators (UI at http://localhost:4000)
npm run dev                    # terminal 2: http://localhost:5173
```

In emulator mode no real emails are sent: open the emulator UI (http://localhost:4000 → Authentication)
or the emulator terminal output to find the verification / password-reset links.

## Go live (one-time setup, ~15 minutes)

Every push to `main` deploys automatically via `.github/workflows/deploy.yml`.
The deployed site reads its Firebase config from Firebase Hosting, so no config values need copying.

### 1. Firebase project
1. Go to https://console.firebase.google.com → **Create a project** (e.g. "Peak Stoneworkz").
   Note the **project ID** it shows (e.g. `peak-stoneworkz-1a2b3`). Google Analytics is optional.
   The free Spark plan is enough.
2. **Build → Authentication → Get started → Sign-in method → Email/Password → Enable → Save.**
   (Leave "Email link" off.)
3. **Build → Firestore Database → Create database** → pick a location close to you
   (e.g. `nam5 (us-central)`; this can't be changed later) → **Start in production mode**.
4. **Project settings (⚙) → General → Your apps → Web (`</>`)** → nickname "Kanban" → Register app.
   You don't need to copy the config it shows.

### 2. Deploy key for GitHub
1. Open https://console.cloud.google.com/iam-admin/serviceaccounts and select the same project.
2. **Create service account** → name `github-deploy` → **Create and continue**.
3. Grant roles **Firebase Admin** and **Service Usage Consumer** → **Done**.
4. Click the new account → **Keys → Add key → Create new key → JSON**. A `.json` file downloads.
   Treat it like a password: don't email it or commit it.

### 3. GitHub settings
In this repository: **Settings → Secrets and variables → Actions**
- **Secrets** tab → New repository secret `FIREBASE_SERVICE_ACCOUNT` = paste the entire contents of the `.json` file.
- **Variables** tab → New repository variable `FIREBASE_PROJECT_ID` = your project ID.
- Optional: variable `ALLOWED_DOMAIN` = `peakstoneworkz.com` so only company emails can sign up.

Then delete the downloaded `.json` file from your computer.

### 4. Deploy
**Actions → Deploy to Firebase → Run workflow** (or push to `main`).
When it's green, the app is live at `https://<project-id>.web.app`.

### 5. First sign-in
1. Open the site, **Create account** with your work email, click the verification link in your inbox.
2. Create a project, then **Project settings → Members** → add teammates' emails.
3. Teammates create their own accounts with those same emails and verify them.

Verification and reset emails come from `noreply@<project-id>.firebaseapp.com` and may land in spam
at first. You can edit their wording under **Authentication → Templates**.

### Optional: custom address (e.g. boards.peakstoneworkz.com)
Firebase console → **Hosting → Add custom domain**, then add the DNS records it shows in your
IONOS DNS settings. The custom domain is added to Auth's authorized domains automatically.

## Data model
```
projects/{projectId}        name, key, ownerUid, memberEmails[], cardCounter
  boards/{boardId}          name, columns[], order
  cards/{cardId}            number, boardId, columnId, rank, title, description, priority,
                            assigneeEmail, labels[], dueDate, jobRef, blocked, blockedReason,
                            createdBy, timestamps
    comments/{commentId}    text, authorUid, authorName, createdAt
```

Card order uses fractional indexing (`rank` strings), so moving a card rewrites only that card.

## Project layout
```
src/lib/firebase.ts      Firebase init, emulator wiring
src/lib/db.ts            All Firestore reads/writes
src/lib/rank.ts          Card ordering helpers
src/components/KanbanBoard.tsx  Drag-and-drop board logic
firestore.rules          Security rules (members-only access)
firestore.indexes.json   Composite index for cards by board (deployed with npm run deploy)
```
