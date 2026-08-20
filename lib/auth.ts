import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import GitHubProvider from "next-auth/providers/github";
import { prisma } from "@/db/prisma";
import { compare, hash } from "bcryptjs";
import { UserRole } from "@prisma/client";

// Build providers array conditionally
const providers: any[] = [
  // Email/Password Provider
  CredentialsProvider({
    name: "Credentials",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials) {
      if (!credentials?.email || !credentials?.password) {
        throw new Error("Email and password are required");
      }

      const email = (credentials.email as string).trim().toLowerCase();
      const password = credentials.password as string;
      const user = await prisma.user.findFirst({
        where: { email: { equals: email, mode: "insensitive" } },
        include: { organization: true },
      });

      if (!user || !user.password) {
        throw new Error("Invalid email or password");
      }

      const isPasswordValid = await compare(password, user.password);

      if (!isPasswordValid) {
        throw new Error("Invalid email or password");
      }

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        organizationId: user.organizationId,
      };
    },
  }),
];

// Only add OAuth providers if credentials are provided
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      allowDangerousEmailAccountLinking: true,
    })
  );
}

if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
  providers.push(
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      allowDangerousEmailAccountLinking: true,
    })
  );
}

// NOTE: No PrismaAdapter — we use pure JWT strategy with Credentials provider.
// The adapter was causing /api/auth/session to crash on Vercel cold starts because
// it tried to query Supabase on every session check, even with JWT strategy.

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers,
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: "/login",
    signOut: "/login",
    error: "/login",
    verifyRequest: "/verify-email",
  },
  callbacks: {
    async jwt({ token, user, account }: any) {
      // On initial sign-in, the user object from authorize() is available
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.organizationId = user.organizationId;
      }

      // Only query DB if organizationId is still missing (e.g., OAuth first login)
      if (token.email && !token.organizationId) {
        try {
          let dbUser = await prisma.user.findFirst({
            where: { email: { equals: token.email, mode: "insensitive" } },
          });

          if (!dbUser) {
            // First-time OAuth user — create user + org
            let org = await prisma.organization.findFirst();
            if (!org) {
              const slug = (token.name || token.email.split("@")[0])
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/^-|-$/g, "") + "-" + Date.now();
              org = await prisma.organization.create({
                data: {
                  name: `${token.name || "User"}'s Organization`,
                  slug,
                },
              });
              await prisma.settings.create({
                data: {
                  organizationId: org.id,
                  taxSettings: { defaultTaxRate: 0, taxInclusive: false },
                  invoiceSettings: { prefix: "INV", numberFormat: "00000", defaultTerms: "Net 30" },
                  currency: "USD",
                  timezone: "UTC",
                  fiscalYearStart: "01-01",
                },
              });
            }
            dbUser = await prisma.user.create({
              data: {
                email: token.email.toLowerCase(),
                name: token.name || token.email.split("@")[0],
                image: token.picture || null,
                role: "ADMIN",
                organizationId: org.id,
              },
            });
          } else if (!dbUser.organizationId) {
            let org = await prisma.organization.findFirst();
            if (!org) {
              org = await prisma.organization.create({
                data: { name: "Default Organization", slug: "org-" + Date.now() },
              });
            }
            dbUser = await prisma.user.update({
              where: { id: dbUser.id },
              data: { organizationId: org.id },
            });
          }

          if (dbUser) {
            token.id = dbUser.id;
            token.role = dbUser.role;
            token.organizationId = dbUser.organizationId;
          }
        } catch (error) {
          console.error("Error in JWT callback DB lookup:", error);
          // Don't crash — return token as-is so session stays alive
        }
      }

      return token;
    },
    async session({ session, token }: any) {
      if (session.user && token) {
        session.user.id = token.id as string;
        session.user.role = token.role as UserRole;
        session.user.organizationId = token.organizationId as string | null;
      }
      return session;
    },
  },
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === "development",
  trustHost: true,
});

// Password hashing utility
export async function hashPassword(password: string): Promise<string> {
  return hash(password, 12);
}

// Password comparison utility
export async function comparePassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return compare(password, hashedPassword);
}
