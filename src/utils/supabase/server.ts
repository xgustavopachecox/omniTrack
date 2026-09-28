import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createClient() {
  const cookieStore = await cookies();

  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const rawKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Remove trailing slashes and accidentally appended /rest/v1 paths
  const url = rawUrl
    ? rawUrl.trim().replace(/\/+$/, '').replace(/\/rest\/v1\/?$/i, '')
    : '';
  const key = rawKey ? rawKey.trim() : '';

  if (
    !url ||
    !key ||
    !url.startsWith('http') ||
    url.includes('your-supabase-project') ||
    url.includes('your_supabase') ||
    url.includes('placeholder')
  ) {
    throw new Error(
      'Supabase não configurado. Adicione NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY válidos no seu arquivo .env.local.'
    );
  }

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Chamada ignorada se for Server Component estático
        }
      },
    },
  });
}
