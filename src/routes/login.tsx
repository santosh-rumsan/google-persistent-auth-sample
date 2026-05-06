import { createFileRoute, redirect, useRouter } from "@tanstack/react-router"
import { getSession } from "../server/calendar"
import { authClient } from "../lib/auth-client"
import { Button } from "@/components/ui/button"

export const Route = createFileRoute("/login")({
  loader: async () => {
    const session = await getSession()
    if (session) throw redirect({ to: "/dashboard" })
    return null
  },
  component: LoginPage,
})

function GoogleIcon() {
  return (
    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  )
}

function LoginPage() {
  const router = useRouter()

  const handleLogin = async () => {
    await authClient.signIn.social({
      provider: "google",
      callbackURL: "/dashboard",
    })
    await router.invalidate()
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-background">
      <div className="flex w-full max-w-sm flex-col items-center gap-6 rounded-xl border bg-card p-8 shadow-sm">
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <svg
              className="h-6 w-6 text-primary"
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
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Google Calendar</h1>
          <p className="text-sm text-muted-foreground">
            Sign in to view and manage your calendar events
          </p>
        </div>

        <Button className="w-full" size="lg" onClick={handleLogin}>
          <GoogleIcon />
          Continue with Google
        </Button>

        <p className="text-center text-xs text-muted-foreground">
          You&apos;ll be asked to grant calendar read/write access.
        </p>
      </div>
    </div>
  )
}
