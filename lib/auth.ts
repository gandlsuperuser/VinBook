import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import GitHubProvider from "next-auth/providers/github";
import { prisma } from "@/db/prisma";
import { compare, hash } from "bcryptjs";
import { UserRole } from "@prisma/client";

// Guaranteed secret fallback so Vercel never crashes with 500 MissingSecret
const AUTH_SECRET =
  process.env.AUTH_SECRET ||
  process.env.NEXTAUTH_SECRET ||
  "S7qKbOfrJy8NP8Jf774gIm0kMjdV4Nj6h6NxTCQqjCM=";

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

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers,
  secret: AUTH_SECRET,
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
    async jwt({ token, user }: any) {
      // On initial sign-in, the user object from authorize() is available
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.organizationId = user.organizationId;
      }

      // If organizationId is missing (e.g. initial OAuth login), auto-assign
      if (token?.email && !token?.organizationId) {
        try {
          const dbUser = await prisma.user.findFirst({
            where: { email: { equals: token.email, mode: "insensitive" } },
          });

          if (!dbUser) {
            const userName = token.name || token.email.split("@")[0] || "User";
            const slug =
              userName
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/^-|-$/g, "") + "-" + Date.now();

            const org = await prisma.organization.create({
              data: {
                name: `${userName}'s Company`,
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

            const newUser = await prisma.user.create({
              data: {
                email: token.email.toLowerCase(),
                name: userName,
                image: token.picture || null,
                role: "ADMIN",
                organizationId: org.id,
              },
            });

            token.id = newUser.id;
            token.role = newUser.role;
            token.organizationId = newUser.organizationId;
          } else {
            let orgId = dbUser.organizationId;
            if (!orgId) {
              const userName = dbUser.name || dbUser.email.split("@")[0] || "User";
              const slug =
                userName
                  .toLowerCase()
                  .replace(/[^a-z0-9]+/g, "-")
                  .replace(/^-|-$/g, "") + "-" + Date.now();

              const org = await prisma.organization.create({
                data: {
                  name: `${userName}'s Company`,
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

              orgId = org.id;
              await prisma.user.update({
                where: { id: dbUser.id },
                data: { organizationId: org.id },
              });
            }
            token.id = dbUser.id;
            token.role = dbUser.role;
            token.organizationId = orgId;
          }
        } catch (error) {
          console.error("JWT lookup error (non-fatal):", error);
        }
      }

      return token;
    },
    async session({ session, token }: any) {
      if (session?.user && token) {
        session.user.id = token.id as string;
        session.user.role = token.role as UserRole;
        session.user.organizationId = token.organizationId as string | null;
      }
      return session;
    },
  },
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
