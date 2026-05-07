import { db } from "./db.server"

interface Account {
  id: string
  userId: string
  providerId: string
  accessToken: string | null
  refreshToken: string | null
  accessTokenExpiresAt: string | null
}

async function refreshToken(account: Account): Promise<string> {
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

export async function getValidAccessToken(userId: string): Promise<string> {
  const account = db
    .prepare("SELECT * FROM account WHERE userId = ? AND providerId = 'google' LIMIT 1")
    .get(userId) as Account | undefined

  if (!account) throw new Error("No Google account linked")

  const expiresAt = account.accessTokenExpiresAt
    ? new Date(account.accessTokenExpiresAt).getTime()
    : 0

  if (!account.accessToken || Date.now() > expiresAt - 5 * 60 * 1000) {
    return refreshToken(account)
  }

  return account.accessToken
}
