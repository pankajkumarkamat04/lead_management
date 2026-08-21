import { NextResponse, type NextRequest } from 'next/server';
import { verifySession } from './lib/auth/jwt';
import { SESSION_COOKIE } from './lib/env';

/** Sections only administrators may open. */
const ADMIN_PREFIXES = ['/dashboard/sites', '/dashboard/users'];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = await verifySession(
    request.cookies.get(SESSION_COOKIE)?.value,
  );

  if (pathname === '/login') {
    return session
      ? NextResponse.redirect(new URL('/dashboard', request.url))
      : NextResponse.next();
  }

  if (!session) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (
    session.role !== 'admin' &&
    ADMIN_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  ) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/login'],
};
