import { createServerFn } from "@tanstack/react-start"
import { getRequest } from "@tanstack/react-start/server"

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

export const getSession = createServerFn({ method: "GET" }).handler(async () => {
  const { auth } = await import("../lib/auth.server")
  const request = getRequest()
  return auth.api.getSession({ headers: request.headers })
})

export const fetchCalendarEvents = createServerFn({ method: "GET" }).handler(
  async (): Promise<CalendarEvent[]> => {
    const { auth } = await import("../lib/auth.server")
    const { getValidAccessToken } = await import("../lib/googleToken.server")
    const request = getRequest()
    const session = await auth.api.getSession({ headers: request.headers })

    if (!session) throw new Error("Unauthorized")

    const accessToken = await getValidAccessToken(session.user.id)

    const url = new URL("https://www.googleapis.com/calendar/v3/calendars/primary/events")
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
