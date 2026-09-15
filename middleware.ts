import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const PUBLIC = new Set(["/", "/login", "/signup"]);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get("ag_session")?.value;
  const secret = process.env.AUTH_SECRET;
  let authed = false;
  if (token && secret) {
    try {
      await jwtVerify(token, new TextEncoder().encode(secret));
      authed = true;
    } catch {
      authed = false;
    }
  }

  if (PUBLIC.has(pathname)) {
    if (authed && (pathname === "/login" || pathname === "/signup")) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.next();
  }

  if (!authed) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
