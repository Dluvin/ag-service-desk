import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { homePath } from "@/lib/home";

const PUBLIC = new Set(["/", "/login", "/signup", "/signup/thanks", "/welcome", "/forgot", "/contact", "/privacy", "/support", "/platform/login", "/qbwc"]);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (
    pathname.startsWith("/api/stripe/webhook") ||
    pathname.startsWith("/api/login-brand") ||
    pathname.startsWith("/api/company-logo") ||
    pathname.startsWith("/qbwc")
  ) {
    return NextResponse.next();
  }
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Server Actions POST to the page URL. A redirect here makes Next.js
  // report "Server Action was not found" instead of running the action.
  if (request.method === "POST" && request.headers.get("next-action")) {
    return NextResponse.next();
  }

  const secret = process.env.AUTH_SECRET;
  const tenantToken = request.cookies.get("ag_session")?.value;
  const platformToken = request.cookies.get("ag_platform")?.value;
  let tenantAuthed = false;
  let tenantRole = "";
  let platformAuthed = false;
  if (secret) {
    const key = new TextEncoder().encode(secret);
    if (tenantToken) {
      try {
        const { payload } = await jwtVerify(tenantToken, key);
        tenantAuthed = true;
        tenantRole = typeof payload.role === "string" ? payload.role : "";
      } catch {
        tenantAuthed = false;
      }
    }
    if (platformToken) {
      try {
        await jwtVerify(platformToken, key);
        platformAuthed = true;
      } catch {
        platformAuthed = false;
      }
    }
  }

  if (pathname.startsWith("/platform")) {
    if (pathname === "/platform/login") {
      if (platformAuthed) return NextResponse.redirect(new URL("/platform", request.url));
      return NextResponse.next();
    }
    if (!platformAuthed) return NextResponse.redirect(new URL("/platform/login", request.url));
    return NextResponse.next();
  }

  if (PUBLIC.has(pathname)) {
    if (tenantAuthed && (pathname === "/" || pathname === "/login" || pathname === "/signup")) {
      return NextResponse.redirect(new URL(homePath(tenantRole), request.url));
    }
    return NextResponse.next();
  }

  if (!tenantAuthed) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
