import NextAuth, { type DefaultSession } from "next-auth";
import Google from "next-auth/providers/google";

/**
 * Single-operator authentication.
 *
 * Whitelist comes from AUTH_ALLOWED_EMAILS — comma-separated, case-insensitive.
 * Any email not on the list is rejected at signIn AND defensively dropped from
 * the session callback (defence in depth in case the whitelist is changed mid-session).
 */
const ALLOWED_EMAILS = (process.env.AUTH_ALLOWED_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

function isAllowed(email: string | null | undefined): boolean {
  if (!email) return false;
  return ALLOWED_EMAILS.includes(email.toLowerCase());
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET
    })
  ],
  pages: {
    signIn: "/sign-in",
    error: "/sign-in"
  },
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 24 * 7 // 7 days
  },
  // Required when running behind Vercel / proxy. Safe to leave on; NextAuth
  // still validates the Host header against AUTH_URL when set.
  trustHost: true,
  callbacks: {
    async signIn({ user }) {
      return isAllowed(user.email);
    },
    async jwt({ token, user }) {
      if (user?.email) token.email = user.email;
      // If the whitelist changes mid-session, expire the token next request.
      if (token.email && !isAllowed(token.email as string)) {
        return null as unknown as typeof token;
      }
      return token;
    },
    async session({ session, token }) {
      if (!isAllowed((token?.email as string | undefined) ?? session.user?.email)) {
        // Force the route guard to treat this as unauthenticated.
        return { ...session, user: undefined as unknown as DefaultSession["user"] };
      }
      return session;
    }
  }
});
