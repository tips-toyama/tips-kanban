# TIPS Kanban

Simple Trello alternative for small teams besed on HTML `draggable` attribute.

This is a [Next.js](https://nextjs.org/) project

## Getting Started

Rename `.env.sample` to `.env` and edit it.

Authentication uses [Better Auth](https://better-auth.com/docs/integrations/next) with TIPS OAuth. Register `${BETTER_AUTH_URL}/api/auth/callback/tips` as the callback URL in your TIPS OAuth client.

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

- BETTER_AUTH_SECRET = A random secret of at least 32 characters (generate with `openssl rand -base64 32`).
- BETTER_AUTH_URL = The application origin, e.g. `http://localhost:3000`.
- FIREBASE_PROJECT_ID = [Firebase project id](https://firebase.google.com/docs/projects/learn-more#project-identifiers)
- FIREBASE_CLIENT_EMAIL = in Firebase auth file like `firebase-adminsdk-aaaaa@<<projectId>>.iam.gserviceaccount.com`
- FIREBASE_PRIVATE_KEY = in Firebase auth file like "-----BEGIN PRIVATE KEY-----\n...
- FIRESTORE_PREFIX = All collection about TIPS Kanban has this prefix. any string is OK.
- FIRESTORAGE_BUCKET = Firestorage bucket name
- CLIENT_ID = TIPS OAuth client ID.
- CLIENT_SECRET = TIPS OAuth client secret.
- API_ORIGIN = TIPS API origin.
- NEXT_PUBLIC_SIGNIN_METHOD = (optional) Set to `tips` to start TIPS sign-in automatically.
- NEXT_PUBLIC_TITLE = Shows on Toppage and title


### FIRESTORE_PREFIX

TIPS Kanban makes some collection in Firestore. If `FIRESTORE_PREFIX` is `myKanban`...

* myKanban-board
* myKanban-card
* myKanban-comment
* myKanban-history
* myKanban-user

## Authentication migration

Replace `NEXTAUTH_SECRET` and `NEXTAUTH_URL` with the `BETTER_AUTH_*` variables above. Existing NextAuth sessions are not compatible; users must sign in again. No board-data migration is needed: the original, case-sensitive TIPS ID is stored in `user.accountId` and remains the key for memberships and history.

Better Auth uses stateless encrypted HTTP-only cookies for sessions and provider tokens; no new database is required. Server-side session checks refresh expired access tokens through `/v3/refresh`, forward rotated cookies, and require sign-in again if refresh fails. Tokens are not included in browser session responses. Stateless sessions cannot be individually revoked across devices; sign-out clears cookies on the current browser. See [Better Auth stateless sessions](https://better-auth.com/docs/concepts/session-management#stateless-session-management).

Run authentication checks with `pnpm exec tsx --test src/lib/*.test.ts` and type checking with `pnpm exec tsc --noEmit`.
