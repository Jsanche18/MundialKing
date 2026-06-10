import NextAuth from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { db } from "./lib/db"
import bcrypt from "bcryptjs"

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }
        const user = await db.user.findUnique({
          where: { email: credentials.email as string }
        })
        if (!user) {
          return null
        }
        // For seed/demo users who have a plain password, we can skip bcrypt or check both
        let isValid = false;
        try {
          isValid = await bcrypt.compare(credentials.password as string, user.passwordHash);
        } catch (e) {
          isValid = user.passwordHash === credentials.password;
        }

        if (!isValid) {
          return null
        }
        return {
          id: user.id,
          name: user.name,
          email: user.email,
        }
      }
    })
  ],
  pages: {
    signIn: "/",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
      }
      return session;
    }
  },
  secret: process.env.AUTH_SECRET,
})

// Extension of NextAuth types
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    }
  }
}
