import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/jwt";

export async function POST() {
  const response = NextResponse.json({ success: true, message: "Logged out successfully" });
  clearSessionCookie(response);
  return response;
}

export async function GET() {
  const response = NextResponse.json({ success: true, message: "Logged out successfully" });
  clearSessionCookie(response);
  return response;
}
