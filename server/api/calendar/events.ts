import { defineEventHandler, getHeader, createError } from "nitro/h3"
import { auth } from "../../../src/lib/auth.server"
import { getValidAccessToken } from "../../../src/lib/googleToken.server"
import type { CalendarEvent } from "../../../src/server/calendar"

export default defineEventHandler(async (event) => {
  const authHeader = getHeader(event, "authorization")
  if (!authHeader?.startsWith("Bearer ")) {
    throw createError({ statusCode: 401, message: "Missing bearer token" })
  }

  const session = await auth.api.getSession({
    headers: new Headers({ authorization: authHeader }),
  })

  if (!session) {
    throw createError({ statusCode: 401, message: "Invalid or expired token" })
  }

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
    throw createError({
      statusCode: calRes.status,
      message: `Calendar API error: ${err.error?.message ?? calRes.status}`,
    })
  }

  const calData = (await calRes.json()) as { items?: CalendarEvent[] }
  return { events: calData.items ?? [] }
})
