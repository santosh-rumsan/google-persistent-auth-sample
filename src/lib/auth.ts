import { betterAuth } from "better-auth"
import { db } from "./db"

export const auth = betterAuth({
  database: db,
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      scope: [
        "openid",
        "email",
        "profile",
        "https://www.googleapis.com/auth/calendar",
      ],
      accessType: "offline",
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days
    updateAge: 60 * 60 * 24,      // Slide session if older than 1 day
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,
    },
  },
})
