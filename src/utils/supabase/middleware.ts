import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const MIDDLEWARE_AUTH_TIMEOUT_MS = 3500;

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const rawKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const supabaseUrl = rawUrl
    ? rawUrl.trim().replace(/\/+$/, '').replace(/\/rest\/v1\/?$/i, '')
    : '';
  const supabaseAnonKey = rawKey ? rawKey.trim() : '';

  // Se variáveis do Supabase não estiverem configuradas, libera a rota sem bloquear
  if (
    !supabaseUrl ||
    !supabaseAnonKey ||
    !supabaseUrl.startsWith('http') ||
    supabaseUrl.includes('your-supabase-project') ||
    supabaseUrl.includes('your_supabase') ||
    supabaseUrl.includes('placeholder')
  ) {
    return supabaseResponse;
  }

  const pathname = request.nextUrl.pathname;

  // Ignora rotas de API e arquivos estáticos caso cheguem ao middleware
  if (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname === '/manifest.json' ||
    pathname === '/sw.js'
  ) {
    return supabaseResponse;
  }

  try {
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    });

    // Proteção contra 504 MIDDLEWARE_INVOCATION_TIMEOUT na Vercel via Promise.race
    const authResult = await Promise.race([
      supabase.auth.getUser(),
      new Promise<{ data: { user: null }; timedOut: true }>((resolve) =>
        setTimeout(
          () => resolve({ data: { user: null }, timedOut: true }),
          MIDDLEWARE_AUTH_TIMEOUT_MS
        )
      ),
    ]);

    // Se o Supabase demorar além do timeout, libera a rota para não causar erro 504
    if ('timedOut' in authResult && authResult.timedOut) {
      return supabaseResponse;
    }

    const user = authResult.data?.user ?? null;

    const publicRoutes = [
      '/login',
      '/cadastro',
      '/recuperar-senha',
      '/auth/callback',
    ];
    const isPublicRoute = publicRoutes.some(
      (route) => pathname === route || pathname.startsWith('/auth/')
    );

    if (!user && !isPublicRoute) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }

    if (
      user &&
      (pathname === '/login' ||
        pathname === '/cadastro' ||
        pathname === '/recuperar-senha')
    ) {
      const url = request.nextUrl.clone();
      url.pathname = '/';
      return NextResponse.redirect(url);
    }
  } catch {
    // Em caso de oscilação de rede no Supabase, libera a resposta sem derrubar a aplicação
    return supabaseResponse;
  }

  return supabaseResponse;
}
