import { NextResponse } from "next/server";
import { prisma } from "@/db/prisma";
import crypto from "crypto";
import { Resend } from "resend";

export async function POST(request: Request) {
  try {
    const { email: rawEmail } = await request.json();

    if (!rawEmail || typeof rawEmail !== "string") {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    const email = rawEmail.trim().toLowerCase();

    // Try to find the user by email (case-insensitive)
    const user = await prisma.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
    });

    // For security, return success message even if user not found to prevent user enumeration
    if (!user) {
      return NextResponse.json({
        message: "If an account exists for this email, a reset link has been sent.",
      });
    }

    // Generate a one-time token and expiry (1 hour)
    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 60 * 60 * 1000);

    // Delete any existing tokens for this user's email
    await prisma.verificationToken.deleteMany({
      where: { identifier: user.email },
    });

    // Store new token in database
    await prisma.verificationToken.create({
      data: {
        identifier: user.email,
        token,
        expires,
      },
    });

    // Determine absolute base URL
    let baseUrl = process.env.NEXTAUTH_URL;
    if (!baseUrl) {
      const host = request.headers.get("host");
      const proto = request.headers.get("x-forwarded-proto") || "http";
      if (host) {
        baseUrl = `${proto}://${host}`;
      } else if (process.env.VERCEL_URL) {
        baseUrl = `https://${process.env.VERCEL_URL}`;
      } else {
        baseUrl = "http://localhost:3000";
      }
    }

    const resetLink = `${baseUrl}/reset-password?token=${token}&email=${encodeURIComponent(user.email)}`;

    console.log("Password reset link for", user.email, "=>", resetLink);

    // Send email using Resend if API key is provided
    let emailSent = false;
    if (process.env.RESEND_API_KEY) {
      try {
        const resend = new Resend(process.env.RESEND_API_KEY);
        const fromEmail = process.env.EMAIL_FROM || "FastKeep <onboarding@resend.dev>";
        
        await resend.emails.send({
          from: fromEmail,
          to: user.email,
          subject: "Reset your FastKeep password",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 8px;">
              <h2 style="color: #111827; font-size: 20px; font-weight: bold; margin-bottom: 16px;">Reset Your Password</h2>
              <p style="color: #374151; font-size: 14px; line-height: 1.5; margin-bottom: 16px;">Hi ${user.name || "there"},</p>
              <p style="color: #374151; font-size: 14px; line-height: 1.5; margin-bottom: 24px;">We received a request to reset your password for your FastKeep account. Click the button below to choose a new password. This link will expire in 1 hour.</p>
              <div style="margin-bottom: 24px;">
                <a href="${resetLink}" style="background-color: #0f172a; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px; display: inline-block;">Reset Password</a>
              </div>
              <p style="color: #6b7280; font-size: 13px; line-height: 1.5; margin-bottom: 16px;">If you didn't request a password reset, you can safely ignore this email.</p>
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
              <p style="color: #9ca3af; font-size: 12px; word-break: break-all;">Or copy and paste this URL into your browser: <br/><a href="${resetLink}" style="color: #2563eb;">${resetLink}</a></p>
            </div>
          `,
        });
        emailSent = true;
      } catch (emailError) {
        console.error("Failed to send email via Resend:", emailError);
      }
    }

    return NextResponse.json({
      message: "Password reset email sent. Please check your inbox.",
      emailSent,
      // Include reset link in development mode if email service isn't configured
      ...(process.env.NODE_ENV === "development" && !emailSent ? { debugResetLink: resetLink } : {}),
    });
  } catch (error) {
    console.error("Error in forgot-password handler:", error);
    return NextResponse.json(
      { error: "Failed to process password reset request" },
      { status: 500 }
    );
  }
}
