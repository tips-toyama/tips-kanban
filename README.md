# TIPS Kanban

Simple Trello alternative for small teams besed on HTML `draggable` attribute.

This is a [Next.js](https://nextjs.org/) project

## Getting Started

Rename `.env.sample` to `.env` and edit it.

Copy `/sample/[...nextauth].ts` to `/src/pages/api/auth` (maybe `mkdir` it) and edit it. (ref: [Next Auth example](https://next-auth.js.org/getting-started/example))

Run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## .env

NEXTAUTH_SECRET = [Next Auth env](https://next-auth.js.org/configuration/options#nextauth_url)  
NEXTAUTH_URL= [Next Auth env](https://next-auth.js.org/configuration/options#nextauth_secret)  
FIREBASE_PROJECT_ID = [Firebase project id](https://firebase.google.com/docs/projects/learn-more#project-identifiers)  
FIREBASE_CLIENT_EMAIL = in Firebase auth file like `firebase-adminsdk-aaaaa@<<projectId>>.iam.gserviceaccount.com`  
FIREBASE_PRIVATE_KEY = in Firebase auth file like "-----BEGIN PRIVATE KEY-----\n...  
FIRESTORE_PREFIX = All collection about TIPS Kanban has this prefix. any string is OK.  
FIRESTORAGE_BUCKET = Firestorage bucket name
NEXT_PUBLIC_SIGNIN_METHOD = (optional) If set, only this signIn method will be available and automatically selected. `config.id` in `[...nextauth].ts`.
NEXT_PUBLIC_TITLE = Shows on Toppage and title


### FIRESTORE_PREFIX

TIPS Kanban makes some collection in Firestore. If `FIRESTORE_PREFIX` is `myKanban`...

* myKanban-board
* myKanban-card
* myKanban-comment
* myKanban-history
* myKanban-user
