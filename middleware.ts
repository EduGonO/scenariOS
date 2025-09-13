import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export const config = {
  matcher: ["/mcp"],
};

export function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();
  url.pathname = "/api/mcp";
  return NextResponse.rewrite(url);
}
