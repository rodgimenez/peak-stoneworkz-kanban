# Peak Stoneworkz Boards

A Kanban / Jira-style board for Peak Stoneworkz, built with React + Vite + TypeScript, Tailwind, dnd-kit and Firebase (Auth, Firestore, Hosting).

## Features
- Google sign-in (optionally limited to your company domain)
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

In emulator mode the Google sign-in popup shows a fake account picker: click "Add new account".

## Connect to a real Firebase project
1. In the Firebase console, create a project (or reuse the inventory one) and add a **Web app**.
2. Turn on **Authentication → Sign-in method → Google**.
3. Create a **Firestore** database (production mode).
4. Copy the web app config into `.env.local` and set `VITE_USE_EMULATORS=false`.
   Optionally set `VITE_ALLOWED_DOMAIN=peakstoneworkz.com`.
5. Put your project ID in `.firebaserc`, then:

```bash
npx firebase login
npm run deploy                 # builds, deploys Hosting + Firestore rules
```

To lock data access to company accounts at the database level as well, enable the domain check in `firestore.rules` (see the comment in `signedIn()`).

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
