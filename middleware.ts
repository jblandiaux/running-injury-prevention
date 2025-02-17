import createMiddleware from 'next-intl/middleware';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Créer le middleware pour la gestion des locales
const intlMiddleware = createMiddleware({
  locales: ['en', 'fr'],
  defaultLocale: 'en',
  localePrefix: 'always'
});

// Middleware principal qui gère à la fois l'authentification et les locales
export default function middleware(request: NextRequest) {
  const publicPatterns = ['/auth/signin', '/auth/error'];
  const isPublicPage = publicPatterns.some(pattern => 
    request.nextUrl.pathname.includes(pattern)
  );

  // Si c'est une page publique ou si l'utilisateur est authentifié,
  // on applique seulement le middleware des locales
  if (isPublicPage || request.cookies.has('next-auth.session-token')) {
    return intlMiddleware(request);
  }

  // Sinon, on redirige vers la page de connexion
  const locale = request.cookies.get('NEXT_LOCALE')?.value || 'en';
  return NextResponse.redirect(new URL(`/${locale}/auth/signin`, request.url));
}

// Configurer les routes qui doivent être gérées par le middleware
export const config = {
  matcher: [
    // Matcher pour les routes qui nécessitent le middleware de locale
    '/((?!api|_next|.*\\..*).*)',
    // Matcher pour les routes qui nécessitent l'authentification
    '/dashboard/:path*'
  ]
}; 