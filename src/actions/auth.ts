'use server';

import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { z } from 'zod';
import { createClient } from '@/utils/supabase/server';

const loginSchema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'A senha deve ter no mínimo 6 caracteres'),
});

const signUpSchema = z
  .object({
    name: z.string().min(2, 'O nome deve ter no mínimo 2 caracteres'),
    email: z.string().email('E-mail inválido'),
    password: z.string().min(6, 'A senha deve ter no mínimo 6 caracteres'),
    confirmPassword: z.string().min(6, 'A confirmação de senha deve ter no mínimo 6 caracteres'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'As senhas não coincidem',
    path: ['confirmPassword'],
  });

const resetPasswordSchema = z.object({
  email: z.string().email('E-mail inválido'),
});

export type ActionResponse = {
  error?: string;
  success?: boolean;
  message?: string;
};

// Formata erros de rede, DNS e Supabase em mensagens claras em português
function formatSupabaseError(error: any): string {
  if (!error) return '';
  const message = typeof error === 'string' ? error : error.message || String(error);
  const lowerMsg = message.toLowerCase();

  if (
    lowerMsg.includes('fetch failed') ||
    lowerMsg.includes('enotfound') ||
    lowerMsg.includes('econnrefused') ||
    lowerMsg.includes('failed to fetch') ||
    lowerMsg.includes('networkerror') ||
    lowerMsg.includes('invalid url') ||
    lowerMsg.includes('supabase não configurado') ||
    error.status === 0
  ) {
    return 'Não foi possível conectar ao Supabase. O domínio da URL (https://nfgolpxkfqvpxbkwmtyk.supabase.co) não foi encontrado na internet. Verifique se a URL do projeto no Supabase está correta e se o projeto está ativo.';
  }

  if (lowerMsg.includes('already registered') || lowerMsg.includes('user_already_exists')) {
    return 'Este e-mail já está cadastrado no sistema.';
  }
  if (lowerMsg.includes('invalid login credentials')) {
    return 'E-mail ou senha incorretos. Verifique suas credenciais.';
  }
  if (lowerMsg.includes('email not confirmed')) {
    return 'E-mail ainda não confirmado. Por favor, verifique sua caixa de entrada.';
  }
  if (lowerMsg.includes('weak') || lowerMsg.includes('at least 6 characters')) {
    return 'A senha informada é muito fraca. Escolha uma senha de no mínimo 6 caracteres.';
  }
  if (lowerMsg.includes('rate limit')) {
    return 'Muitas tentativas em pouco tempo. Aguarde alguns instantes e tente novamente.';
  }
  if (lowerMsg.includes('apikey') || lowerMsg.includes('jwt') || lowerMsg.includes('invalid api key')) {
    return 'A chave Anon/Publishable do Supabase é inválida. Verifique o arquivo .env.local.';
  }

  return message;
}

export async function signInWithPassword(
  prevState: ActionResponse | null,
  formData: FormData
): Promise<ActionResponse> {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  const validation = loginSchema.safeParse({ email, password });
  if (!validation.success) {
    return { error: validation.error.issues[0].message };
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { error: formatSupabaseError(error) };
    }
  } catch (err: any) {
    if (err?.digest?.startsWith('NEXT_REDIRECT')) throw err;
    return { error: formatSupabaseError(err) };
  }

  redirect('/');
}

export async function signUp(
  prevState: ActionResponse | null,
  formData: FormData
): Promise<ActionResponse> {
  const name = formData.get('name') as string;
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const confirmPassword = formData.get('confirmPassword') as string;

  const validation = signUpSchema.safeParse({
    name,
    email,
    password,
    confirmPassword,
  });

  if (!validation.success) {
    return { error: validation.error.issues[0].message };
  }

  try {
    const headersList = await headers();
    const host = headersList.get('host') || 'localhost:3000';
    const protocol = headersList.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https');
    const origin = `${protocol}://${host}`;

    const supabase = await createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
        },
        emailRedirectTo: `${origin}/auth/callback`,
      },
    });

    if (error) {
      return { error: formatSupabaseError(error) };
    }

    if (data.user && !data.session) {
      return {
        success: true,
        message: 'Conta criada com sucesso! Enviamos um e-mail de confirmação. Por favor, verifique sua caixa de entrada.',
      };
    }
  } catch (err: any) {
    if (err?.digest?.startsWith('NEXT_REDIRECT')) throw err;
    return { error: formatSupabaseError(err) };
  }

  redirect('/');
}

export async function signInWithGoogle() {
  try {
    const headersList = await headers();
    const host = headersList.get('host') || 'localhost:3000';
    const protocol = headersList.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https');
    const origin = `${protocol}://${host}`;

    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${origin}/auth/callback`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });

    if (error) {
      const formatted = formatSupabaseError(error);
      return redirect(`/login?error=${encodeURIComponent(formatted)}`);
    }

    if (data?.url) {
      redirect(data.url);
    }
  } catch (err: any) {
    if (err?.digest?.startsWith('NEXT_REDIRECT')) throw err;
    const formatted = formatSupabaseError(err);
    return redirect(`/login?error=${encodeURIComponent(formatted)}`);
  }
}

export async function signOut() {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
  } catch {
    // Ignore error on signout
  }
  redirect('/login');
}

export async function resetPassword(
  prevState: ActionResponse | null,
  formData: FormData
): Promise<ActionResponse> {
  const email = formData.get('email') as string;

  const validation = resetPasswordSchema.safeParse({ email });
  if (!validation.success) {
    return { error: validation.error.issues[0].message };
  }

  try {
    const headersList = await headers();
    const host = headersList.get('host') || 'localhost:3000';
    const protocol = headersList.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https');
    const origin = `${protocol}://${host}`;

    const supabase = await createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/auth/callback?next=/recuperar-senha`,
    });

    if (error) {
      return { error: formatSupabaseError(error) };
    }

    return {
      success: true,
      message: 'E-mail de recuperação enviado! Verifique sua caixa de entrada para redefinir sua senha.',
    };
  } catch (err: any) {
    if (err?.digest?.startsWith('NEXT_REDIRECT')) throw err;
    return { error: formatSupabaseError(err) };
  }
}
