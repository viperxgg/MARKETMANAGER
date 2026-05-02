import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

/**
 * Single-operator authentication via username + password.
 *
 * Both values come from environment variables (AUTH_USERNAME, AUTH_PASSWORD).
 * `OWNER_EMAIL` is reused as the canonical session email so all downstream
 * audit code (ExecutionLog.operatorEmail, getOwnerEmail, requireOwner) keeps
 * working unchanged.
 *
 * Why not OAuth: simpler operator UX for a private tool — no third-party
 * redirect dance and no OAuth client setup.
 * The credential check happens entirely server-side inside `authorize`.
 */
function timingSafeEqual(a: string, b: string): boolean {
  // Constant-time-ish string compare. Avoid early-return on first mismatch so
  // an attacker cannot infer the password prefix from response timing.
  let mismatch = a.length ^ b.length;
  const length = Math.max(a.length, b.length);
  for (let i = 0; i < length; i++) {
    const left = i < a.length ? a.charCodeAt(i) : 0;
    const right = i < b.length ? b.charCodeAt(i) : 0;
    mismatch |= left ^ right;
  }
  return mismatch === 0;
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        username: { label: "اسم المستخدم", type: "text" },
        password: { label: "كلمة السر", type: "password" }
      },
      async authorize(credentials) {
        const username = String(credentials?.username ?? "").trim();
        const password = String(credentials?.password ?? "");
        const expectedUser = process.env.AUTH_USERNAME?.trim();
        const expectedPass = process.env.AUTH_PASSWORD;
        const ownerEmail = process.env.OWNER_EMAIL?.trim();

        if (!expectedUser || !expectedPass) return null;
        if (!username || !password) return null;
        if (!timingSafeEqual(username, expectedUser)) return null;
        if (!timingSafeEqual(password, expectedPass)) return null;

        return {
          id: "owner",
          name: username,
          // Reuse OWNER_EMAIL so audit logs stay consistent with prior runs.
          // Falls back to a synthetic local address if not configured.
          email: ownerEmail && ownerEmail.length > 0 ? ownerEmail : `${username}@local`
        };
      }
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
  // Required when running behind Vercel / proxy.
  trustHost: true,
  callbacks: {
    async jwt({ token, user }) {
      if (user?.email) token.email = user.email;
      if (user?.name) token.name = user.name;
      return token;
    },
    async session({ session, token }) {
      if (token?.email) {
        session.user = {
          ...session.user,
          email: token.email as string,
          name: (token.name as string | undefined) ?? session.user?.name ?? null
        };
      }
      return session;
    }
  }
});
