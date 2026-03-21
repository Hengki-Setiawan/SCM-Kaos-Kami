import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { decrypt } from '@/lib/auth';

const publicRoutes = ['/login', '/api/webhooks/telegram'];

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const isPublicRoute = publicRoutes.includes(path);

  // Allow next internals and static files
  if (
    path.startsWith('/_next') ||
    path.match(/\.(png|jpg|jpeg|svg|gif|ico|woff|woff2|ttf|eot|webmanifest|json)$/)
  ) {
    return NextResponse.next();
  }

  const session = req.cookies.get('session')?.value;
  const decryptedSession = session ? await decrypt(session) : null;

  // Protect all non-public routes
  if (!isPublicRoute && !decryptedSession?.role) {
    // If it's an API request, return 401
    if (path.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    // Otherwise redirect to login
    return NextResponse.redirect(new URL('/login', req.nextUrl));
  }

  // Redirect to dashboard if trying to access login while already authenticated
  if (path === '/login' && decryptedSession?.role) {
    return NextResponse.redirect(new URL('/', req.nextUrl));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
