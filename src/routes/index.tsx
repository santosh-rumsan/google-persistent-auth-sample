import { createFileRoute, redirect } from "@tanstack/react-router"
import { getSession } from "../server/calendar"

export const Route = createFileRoute("/")({
  loader: async () => {
    const session = await getSession()
    throw redirect({ to: session ? "/dashboard" : "/login" })
  },
})
