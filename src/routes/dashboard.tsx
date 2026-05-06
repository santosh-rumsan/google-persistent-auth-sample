import { createFileRoute, redirect, useRouter } from "@tanstack/react-router"
import { getSession, fetchCalendarEvents, type CalendarEvent } from "../server/calendar"
import { authClient } from "../lib/auth-client"
import { Button } from "@/components/ui/button"

export const Route = createFileRoute("/dashboard")({
  loader: async () => {
    const session = await getSession()
    if (!session) throw redirect({ to: "/login" })
    const events = await fetchCalendarEvents()
    return { session, events }
  },
  component: Dashboard,
})

function formatEventTime(event: CalendarEvent): string {
  const start = event.start.dateTime ?? event.start.date
  const end = event.end.dateTime ?? event.end.date
  if (!start) return ""

  const isAllDay = !event.start.dateTime

  const fmt = (d: string, allDay: boolean) =>
    new Date(d).toLocaleString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      ...(allDay ? {} : { hour: "numeric", minute: "2-digit" }),
    })

  return end ? `${fmt(start, isAllDay)} – ${fmt(end, isAllDay)}` : fmt(start, isAllDay)
}

function EventCard({ event: calEvent }: { event: CalendarEvent }) {
  const event = calEvent
  const isConfirmed = event.status === "confirmed"
  return (
    <a
      href={event.htmlLink}
      target="_blank"
      rel="noreferrer"
      className="block rounded-lg border bg-card p-4 transition-shadow hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{event.summary || "(No title)"}</p>
          <p className="mt-1 text-sm text-muted-foreground">{formatEventTime(event)}</p>
          {event.location && (
            <p className="mt-1 truncate text-sm text-muted-foreground">
              📍 {event.location}
            </p>
          )}
          {event.description && (
            <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
              {event.description.replace(/<[^>]*>/g, "")}
            </p>
          )}
        </div>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
            isConfirmed
              ? "bg-green-100 text-green-700"
              : "bg-yellow-100 text-yellow-700"
          }`}
        >
          {event.status}
        </span>
      </div>
    </a>
  )
}

function Dashboard() {
  const { session, events } = Route.useLoaderData()
  const router = useRouter()

  const handleSignOut = async () => {
    await authClient.signOut()
    router.navigate({ to: "/login" })
  }

  return (
    <div className="min-h-svh bg-background">
      <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <svg
              className="h-5 w-5 text-primary"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <span className="font-semibold">My Calendar</span>
          </div>
          <div className="flex items-center gap-3">
            {session.user.image && (
              <img
                src={session.user.image}
                alt={session.user.name}
                className="h-7 w-7 rounded-full"
              />
            )}
            <span className="hidden text-sm text-muted-foreground sm:block">
              {session.user.email}
            </span>
            <Button variant="outline" size="sm" onClick={handleSignOut}>
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-lg font-medium">
            Upcoming Events
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              ({events.length})
            </span>
          </h1>
        </div>

        {events.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <p className="text-muted-foreground">No upcoming events on your calendar.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {events.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
