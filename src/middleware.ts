import createMiddleware from 'next-intl/middleware';
import { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

const locales = ['en', 'fr'];
const publicPages = ['/auth/signin', '/auth/error'];

const intlMiddleware = createMiddleware({
  locales,
  defaultLocale: 'en',
  localePrefix: 'always'
});

const authMiddleware = async (request: NextRequest) => {
  const token = await getToken({ req: request });
  const pathname = request.nextUrl.pathname;
  const locale = pathname.split('/')[1];
  const isPublicPage = publicPages.some(page => pathname.includes(page));

  if (!token && !isPublicPage) {
    const signInUrl = new URL(`/${locale}/auth/signin`, request.url);
    return Response.redirect(signInUrl);
  }

  if (token && pathname === `/${locale}`) {
    const dashboardUrl = new URL(`/${locale}/dashboard`, request.url);
    return Response.redirect(dashboardUrl);
  }

  return intlMiddleware(request);
};

export default authMiddleware;

export const config = {
  matcher: ['/', '/(fr|en)/:path*']
}; 