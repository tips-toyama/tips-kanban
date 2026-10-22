# TIPS Kanban

A simple Trello alternative for small teams, built with [Next.js](https://nextjs.org/) and native HTML drag and drop.

## Getting started

You will need Node.js, a package manager, a Firebase project with Firestore and Cloud Storage, and access to a compatible authentication service. See [Authentication](#authentication) before configuring your deployment.

1. Install dependencies with `pnpm install`.
2. Copy `.env.sample` to `.env` and fill in the values described below. Keep service account credentials and client secrets private.
3. Start the development server:

```bash
pnpm dev
# Alternatively: npm run dev or yarn dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

For a production build, run `pnpm build`, then `pnpm start`.

## Configuration

Set these variables in `.env` for local development or in your deployment environment.

| Variable | Purpose |
| --- | --- |
| `AUTH_URL` | Public origin of this application, such as `https://kanban.example.com`. Use HTTPS except on `localhost`. Do not include a path, query, or fragment. |
| `API_ORIGIN` | Origin of the authentication service, such as `https://auth.example.com`. Use HTTPS except on `localhost`. Do not include an API path such as `/v3`. |
| `CLIENT_ID` | OAuth client ID registered with the authentication service. |
| `CLIENT_SECRET` | Required only for clients registered with `client_secret_basic`. Leave empty or unset for clients registered with `none`. This value stays on the server. |
| `FIREBASE_PROJECT_ID` | Firebase project ID. |
| `FIREBASE_CLIENT_EMAIL` | Service account email address from your Firebase credentials. |
| `FIREBASE_PRIVATE_KEY` | Service account private key. Escaped newlines (`\n`) are supported. |
| `FIRESTORE_PREFIX` | Prefix for the application's Firestore collections. Keep the existing value when upgrading to retain access to your data. |
| `FIRESTORAGE_BUCKET` | Cloud Storage bucket name used for attachments. |
| `NEXT_PUBLIC_TITLE` | Optional application name displayed on the home page and in page titles. |

`NEXTAUTH_URL` is supported as a fallback when `AUTH_URL` is unset. `NEXTAUTH_SECRET` and `NEXT_PUBLIC_SIGNIN_METHOD` are no longer used.

For example, the authentication settings for local development might be:

```dotenv
AUTH_URL=http://localhost:3000
API_ORIGIN=https://auth.example.com
CLIENT_ID=your-registered-client-id
CLIENT_SECRET=
```

Replace the example values with your own settings and supply the Firebase variables listed above.

### Firestore collections

With `FIRESTORE_PREFIX=myKanban`, the application uses these collections:

| Collection | Contents |
| --- | --- |
| `myKanban-board` | Boards |
| `myKanban-card` | Cards |
| `myKanban-comment` | Comments |
| `myKanban-history` | Change history |
| `myKanban-user` | Users and board memberships |
| `myKanban-auth-session` | Application login sessions |
| `myKanban-auth-pending` | Pending authorization requests |

## Authentication

TIPS Kanban includes a server-side authentication implementation for the **TIPS authentication service**. Sign-in is currently configured for this service; connecting another identity provider requires adapting the authentication code and profile mapping.

The service calls its API “OAuth v3.” This is the service's API version, not a separate OAuth protocol version. The application uses the OAuth authorization code flow with S256 PKCE and state validation. It does not use OpenID Connect, request an ID token, or send `scope` or `nonce` parameters.

### Configure the authentication service

Register an OAuth client with your authentication service and configure:

- **Client ID:** the same value as `CLIENT_ID`.
- **Redirect URI:** your application origin followed by `/api/auth/callback/tips`. For example, `https://kanban.example.com/api/auth/callback/tips`, or `http://localhost:3000/api/auth/callback/tips` for local development. Register the exact URL, including its scheme, host, port, and path.
- **Client authentication method:** `none` with an empty `CLIENT_SECRET`, or `client_secret_basic` with the matching secret set on the application server.
- **Login portal:** the service's `LOGIN_SERVER` must point to a portal that implements password or passkey sign-in. This application's `/login` page only starts authorization; it does not implement that portal.

The authentication service must provide these endpoints:

| Endpoint | Used for |
| --- | --- |
| `GET /v3/login/authorize` | Starting authorization and redirecting the user to the login portal |
| `POST /v3/login/token` | Exchanging an authorization code and PKCE verifier for tokens |
| `GET /v1/account/get_credential` | Retrieving the signed-in user's profile with a bearer access token |

The profile response must contain a nonempty `attributes.id`. The application uses `attributes.name`, `attributes.displayName`, or `attributes.display_name` as the display name, falling back to the account ID.

See the [authentication service integration guide](docs/README.md) for the API contract. The accompanying [browser client example](docs/auth-client.ts) targets a browser SPA; this application instead handles the code exchange and profile request on the server.

### How sign-in works

1. The user starts sign-in from `/login`.
2. The server creates a short-lived authorization request with a random state and PKCE verifier, then redirects the browser to the authentication service.
3. The authentication service handles sign-in and returns an authorization code to `/api/auth/callback/tips`.
4. The server validates state, consumes the pending request once, exchanges the code, and retrieves the user profile.
5. The server creates an application session and redirects the user to the home page or the requested board.

Access and refresh tokens remain on the server during sign-in and are discarded after the profile is retrieved. They are not stored in browser storage or returned by the application's session endpoint. The application does not refresh upstream tokens.

### Sessions and logout

Application sessions have a fixed lifetime of **eight hours**. Reloading a page or restarting the application server does not end a valid session because session records are stored in Firestore.

The browser receives an opaque session cookie. Firestore stores the SHA-256 digest of its random identifier. Cookies use `HttpOnly` and `SameSite=Lax`; HTTPS deployments also use `Secure` and the `__Host-` prefix. Logout requires a same-origin POST request and deletes the application session.

The application session is independent of the authentication service's session. Signing out of this application does not sign the user out of the authentication service or other devices. Likewise, upstream logout or token revocation does not immediately invalidate the eight-hour application session.

Restrict `<prefix>-auth-session` and `<prefix>-auth-pending` to server access; browser clients must not be able to read or write them. Optionally enable Firestore TTL on their `cleanupAt` fields to remove expired documents. The application checks expiration itself, so access does not depend on TTL cleanup timing.

### Errors and deployment considerations

Failed sign-in attempts return to `/login` with an error category, an upstream HTTP status when available, and the service's `error_id` when supplied. Network errors and non-JSON error responses are also handled. When the service returns `Retry-After`, the login page temporarily disables the sign-in button.

Authorization code exchanges are never retried automatically. Start a new sign-in attempt after a failed exchange.

Authentication logs include only the processing stage and safe error fields. Configure reverse proxies and request monitoring to redact callback query strings, which contain authorization codes and state values.

Authenticated pages, API responses, and session responses are excluded from Service Worker runtime caching. Existing installations should reload to activate the updated worker.

### Upgrading from NextAuth

No NextAuth package or copied authentication route is required. Existing users must sign in again after upgrading; old NextAuth sessions are not migrated.

Account IDs, user records, and board memberships are preserved. For compatibility with existing board access checks, `session.user.email` continues to hold the account ID rather than an email address. Keep your existing Firebase project and `FIRESTORE_PREFIX` settings.

## Verification

Run the authentication tests and TypeScript checks:

```bash
pnpm exec jest src/auth/auth.test.ts --runInBand
pnpm exec tsc --noEmit
```

Before deploying, use your registered client to verify sign-in, profile retrieval, access to existing boards, session persistence after reload, and logout. Also check that reused callbacks are rejected and that authentication service failures produce a useful login error.

Tests use mocks. A working deployment requires real authentication service registration and Firebase credentials.
