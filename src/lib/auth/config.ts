import { PrismaAdapter } from "@auth/prisma-adapter";
import { NextAuthOptions, Session, Profile, Account } from "next-auth";
import { AdapterUser } from "next-auth/adapters";
import GoogleProvider from "next-auth/providers/google";
import { prisma } from "@/lib/prisma";

if (!process.env.GOOGLE_CLIENT_ID) {
  throw new Error("Missing GOOGLE_CLIENT_ID");
}

if (!process.env.GOOGLE_CLIENT_SECRET) {
  throw new Error("Missing GOOGLE_CLIENT_SECRET");
}

const NEXTAUTH_URL = process.env.NEXTAUTH_URL || "http://localhost:3002";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET
    }),
  ],
  session: {
    strategy: "database",
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // 24 hours
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  callbacks: {
    async session({ session, user }: { session: Session; user: AdapterUser }) {
      if (session.user) {
        session.user.id = user.id;
      }
      return session;
    },
    async signIn({ account, profile }: { account: Account | null; profile?: Profile }) {
      if (account?.provider === "google") {
        console.log("Google Sign In Attempt:", {
          account,
          profile,
          timestamp: new Date().toISOString(),
          redirectUrl: `${NEXTAUTH_URL}/api/auth/callback/google`
        });
      }
      return true;
    },
  },
  events: {
    async signIn(message) {
      if (message.user.id) {
        await prisma.user.update({
          where: { id: message.user.id },
          data: { updatedAt: new Date() },
        });
      }
    },
  },
  debug: process.env.NODE_ENV === "development",
  logger: {
    error(code: string, metadata: any) {
      console.error("NextAuth Error:", { code, metadata });
    },
    warn(code: string) {
      console.warn("NextAuth Warning:", code);
    },
    debug(code: string, metadata: any) {
      console.debug("NextAuth Debug:", { code, metadata });
    },
  },
}; 