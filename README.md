# Google Calendar Viewer

A TanStack Start app that authenticates with Google OAuth and displays your upcoming calendar events. Built with React 19, TypeScript, Tailwind CSS v4, and shadcn/ui.

## Stack

- **[TanStack Start](https://tanstack.com/start)** — full-stack React framework (SSR + server functions via Nitro)
- **[better-auth](https://www.better-auth.com/)** — auth library handling Google OAuth and session management
- **[better-sqlite3](https://github.com/WiseLibs/better-sqlite3)** — local SQLite database for persisting sessions and tokens
- **[Google Calendar API v3](https://developers.google.com/calendar/api)** — fetches upcoming events from the user's primary calendar

## How authentication works

### Sign-in flow

1. The user clicks **Continue with Google** on `/login`.
2. `better-auth` redirects to Google's OAuth consent screen, requesting these scopes:
   - `openid`, `email`, `profile` — basic identity
   - `https://www.googleapis.com/auth/calendar` — read/write access to Google Calendar
3. Google redirects back to the app's auth callback (`/api/auth/*`).
4. `better-auth` exchanges the authorization code for an **access token** and a **refresh token**, then writes both to the `account` table in `sqlite.db`.
5. A session cookie is set in the browser (30-day expiry, sliding window).

### Persistent tokens

Google access tokens expire after ~1 hour. The app avoids forcing re-login by storing the refresh token and using it automatically:

- `src/lib/googleToken.server.ts` — `getValidAccessToken(userId)`:
  1. Looks up the user's Google account row in SQLite.
  2. If the access token is still valid (more than 5 minutes of life left), returns it as-is.
  3. If expired (or close to expiring), calls `https://oauth2.googleapis.com/token` with the stored refresh token, updates the `account` row with the new access token and its expiry, and returns the fresh token.

The refresh token is long-lived and persists as long as the user hasn't revoked app access in their Google Account settings.

### Session persistence

- Sessions are stored in SQLite and last **30 days**.
- The session slides: if the session was last updated more than 1 day ago, its expiry is extended automatically on the next request.
- A short-lived session cookie cache (5 minutes) reduces database reads on every request.

## Calendar feature

Once signed in, the dashboard at `/dashboard`:

1. Reads the session token from `better-auth`'s client (`authClient.getSession()`).
2. Sends a `GET /api/calendar/events` request with the session token as a `Bearer` header.
3. The API route (`server/api/calendar/events.ts`):
   - Validates the bearer token with `better-auth`.
   - Calls `getValidAccessToken()` to get a fresh Google access token (refreshing automatically if needed).
   - Queries the Google Calendar API for the next 20 upcoming events from the user's primary calendar, ordered by start time.
4. Each event is rendered as a card showing: title, time range, location (if any), description snippet, and confirmation status.

All-day events and timed events are both handled — the display format adapts based on whether `dateTime` or `date` is present in the event payload.

## Setup

### 1. Google Cloud credentials

Create an OAuth 2.0 client in [Google Cloud Console](https://console.cloud.google.com/):

- **Application type**: Web application
- **Authorized redirect URIs**: `http://localhost:3045/api/auth/callback/google`

Enable the **Google Calendar API** for your project.

### 2. Environment variables

Create a `.env` file:

```env
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
BETTER_AUTH_SECRET=a_random_secret_string
BETTER_AUTH_URL=http://localhost:3045
```

### 3. Install and run

```bash
pnpm install
pnpm dev
```

The app runs at `http://localhost:3045`. SQLite (`sqlite.db`) is created automatically on first run — `better-auth` handles the schema migrations.

## Project structure

```
src/
  lib/
    auth.server.ts        # better-auth configuration (Google provider, session settings)
    auth-client.ts        # browser-side auth client
    db.server.ts          # SQLite connection
    googleToken.server.ts # access token retrieval + auto-refresh logic
  server/
    calendar.ts           # server functions: getSession, fetchCalendarEvents
  routes/
    login.tsx             # /login — Google sign-in button
    dashboard.tsx         # /dashboard — upcoming events list
server/
  api/
    auth/[...].ts         # better-auth catch-all handler
    calendar/events.ts    # GET /api/calendar/events
```
