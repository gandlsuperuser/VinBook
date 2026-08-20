import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { UserRole } from "@prisma/client";

export const SESSION_COOKIE_NAME = "vinbook_session";
const JWT_SECRET_STRING =
  process.env.AUTH_SECRET ||
  process.env.NEXTAUTH_SECRET ||
  "vinbook-super-secret-jwt-key-2026-secure-production";
const JWT_SECRET = new TextEncoder().encode(JWT_SECRET_STRING);

export interface UserSessionPayload {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  organizationId: string;
}

/**
 * Sign a new JWT session token valid for 30 days
 */
export async function createSessionToken(payload: UserSessionPayload): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(JWT_SECRET);
}

/**
 * Verify a JWT session token and return user payload
 */
export async function verifySessionToken(
  token: string
): Promise<UserSessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    if (!payload || !payload.id || !payload.organizationId) {
      return null;
    }
    return {
      id: payload.id as string,
      email: (payload.email || "") as string,
      name: (payload.name || "User") as string,
      role: (payload.role || UserRole.ADMIN) as UserRole,
      organizationId: payload.organizationId as string,
    };
  } catch {
    return null;
  }
}

/**
 * Set the HTTP-Only session cookie on a NextResponse object
 */
export function setSessionCookie(response: NextResponse, token: string) {
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  });
}

/**
 * Remove the session cookie from a NextResponse object
 */
export function clearSessionCookie(response: NextResponse) {
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}
