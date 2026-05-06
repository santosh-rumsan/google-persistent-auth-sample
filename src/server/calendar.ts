import { createServerFn } from "@tanstack/react-start"
import { getRequest } from "@tanstack/react-start/server"
import { auth } from "../lib/auth"
import { db } from "../lib/db"

interface Account {
  id: string
  userId: string
  providerId: string
  accessToken: string | null
  refreshToken: string | null
  accessTokenExpiresAt: string | null
}

export interface CalendarEvent {
  id: string
  summary: string
  description?: string
  start: { dateTime?: string; date?: string }
  end: { dateTime?: string; date?: string }
  location?: string
  status: string
  htmlLink?: string
}

async function refreshGoogleToken(account: Account): Promise<string> {
  if (!account.refreshToken) throw new Error("No refresh token — re-login required")

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: account.refreshToken,
      grant_type: "refresh_token",
    }),
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(`Token refresh failed: ${err.error_description ?? err.error}`)
  }

  const tokens = (await res.json()) as { access_token: string; expires_in: number }

  db.prepare(
    "UPDATE account SET accessToken = ?, accessTokenExpiresAt = ? WHERE id = ?",
  ).run(
    tokens.access_token,
    new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
    account.id,
  )

  return tokens.access_token
}

async function getValidAccessToken(userId: string): Promise<string> {
  const account = db
    .prepare("SELECT * FROM account WHERE userId = ? AND providerId = 'google' LIMIT 1")
    .get(userId) as Account | undefined

  if (!account) throw new Error("No Google account linked")

  const expiresAt = account.accessTokenExpiresAt
    ? new Date(account.accessTokenExpiresAt).getTime()
    : 0

  // Refresh if expired or expiring within 5 minutes
  if (!account.accessToken || Date.now() > expiresAt - 5 * 60 * 1000) {
    return refreshGoogleToken(account)
  }

  return account.accessToken
}

export const getSession = createServerFn({ method: "GET" }).handler(async () => {
  const request = getRequest()
  const session = await auth.api.getSession({ headers: request.headers })
  return session
})

export const fetchCalendarEvents = createServerFn({ method: "GET" }).handler(
  async (): Promise<CalendarEvent[]> => {
    const request = getRequest()
    const session = await auth.api.getSession({ headers: request.headers })

    if (!session) throw new Error("Unauthorized")

    const accessToken = await getValidAccessToken(session.user.id)

    const url = new URL(
      "https://www.googleapis.com/calendar/v3/calendars/primary/events",
    )
    url.searchParams.set("timeMin", new Date().toISOString())
    url.searchParams.set("maxResults", "20")
    url.searchParams.set("singleEvents", "true")
    url.searchParams.set("orderBy", "startTime")

    const calRes = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
    })

    if (!calRes.ok) {
      const err = await calRes.json()
      throw new Error(`Calendar API error: ${err.error?.message ?? calRes.status}`)
    }

    const calData = (await calRes.json()) as { items?: CalendarEvent[] }
    return calData.items ?? []
  },
)
