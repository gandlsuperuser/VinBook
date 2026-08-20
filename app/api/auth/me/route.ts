import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-utils";

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser(request);
    return NextResponse.json({
      authenticated: Boolean(user),
      user: user || null,
    });
  } catch (error) {
    console.error("Error in /api/auth/me:", error);
    return NextResponse.json({ authenticated: false, user: null });
  }
}
