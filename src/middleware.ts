import { type NextRequest } from 'next/server';
import { updateSession } from '@/utils/supabase/middleware';

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Ignora arquivos estáticos, imagens, service workers, manifesto e rotas /api/
     * para evitar latência desnecessária e timeouts no Edge Middleware da Vercel.
     */
    '/((?!api/|_next/static|_next/image|favicon.ico|manifest\\.json|sw\\.js|workbox-.*|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2)$).*)',
  ],
};
