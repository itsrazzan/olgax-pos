import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";
import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";

const handler = toNextJsHandler(auth);

function getClientIP(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

export const GET = handler.GET;

export async function POST(req: NextRequest) {
  const url = new URL(req.url);
  const isSignIn = url.pathname.includes("/sign-in");

  // Only rate-limit sign-in attempts
  if (isSignIn) {
    const ip = getClientIP(req);
    const result = checkRateLimit(`auth:login:${ip}`, {
      maxAttempts: 5,
      windowSeconds: 15 * 60, // 15 minutes
    });

    if (!result.success) {
      const minutes = Math.ceil(result.retryAfterSeconds / 60);
      return NextResponse.json(
        {
          error: {
            message: `Terlalu banyak percobaan login. Silakan coba lagi dalam ${minutes} menit.`,
            code: "RATE_LIMITED",
            status: 429,
          },
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(result.retryAfterSeconds),
          },
        }
      );
    }
  }

  // Delegate to Better Auth handler
  return handler.POST(req);
}
