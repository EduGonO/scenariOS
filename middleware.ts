import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname === '/mcp') {
    const accept = request.headers.get('accept') || '';
    if (
      request.method === 'POST' ||
      request.method === 'DELETE' ||
      accept.includes('text/event-stream')
    ) {
      return NextResponse.rewrite(new URL('/api/mcp', request.url));
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/mcp'],
};
