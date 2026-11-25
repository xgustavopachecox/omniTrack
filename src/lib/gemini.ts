import { GoogleGenAI } from '@google/genai';
import { NextResponse } from 'next/server';

export const HIGH_DEMAND_ERROR_MESSAGE =
  'Os servidores da IA estão com alta demanda momentânea. Por favor, aguarde alguns segundos e tente novamente.';

export const PRIMARY_GEMINI_MODEL = 'gemini-2.5-flash';

export const DEFAULT_FALLBACK_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-1.5-flash',
];

export function isGeminiHighDemandError(error: any): boolean {
  if (!error) return false;
  const status = error.status || error.code || error.statusCode;
  if (
    status === 503 ||
    status === 429 ||
    status === 'UNAVAILABLE' ||
    status === 'RESOURCE_EXHAUSTED'
  ) {
    return true;
  }
  const msg = String(error.message || '').toLowerCase();
  return (
    msg.includes('503') ||
    msg.includes('unavailable') ||
    msg.includes('high demand') ||
    msg.includes('overloaded') ||
    msg.includes('rate limit') ||
    msg.includes('resource exhausted') ||
    msg.includes('spikes in demand') ||
    msg.includes('temporarily') ||
    msg.includes('try again later')
  );
}

export function isModelNotFoundError(error: any): boolean {
  if (!error) return false;
  const status = error.status || error.code || error.statusCode;
  if (status === 404) return true;
  const msg = String(error.message || '').toLowerCase();
  return (
    msg.includes('404') ||
    msg.includes('not found') ||
    msg.includes('no longer available') ||
    msg.includes('is not supported')
  );
}

/**
 * Limpa blocos markdown ```json ... ``` e extrai o objeto/array JSON válido
 * retornado pelo Gemini para nunca quebrar com SyntaxError 500 inesperado.
 */
export function parseGeminiJson<T = any>(rawText: string): T {
  const cleaned = (rawText || '')
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim();

  if (!cleaned) {
    throw new Error('A IA retornou uma resposta vazia.');
  }

  try {
    return JSON.parse(cleaned) as T;
  } catch {
    // Tenta extrair o primeiro objeto {...} ou array [...] válido na string
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      const candidate = cleaned.slice(firstBrace, lastBrace + 1);
      return JSON.parse(candidate) as T;
    }

    const firstBracket = cleaned.indexOf('[');
    const lastBracket = cleaned.lastIndexOf(']');
    if (firstBracket !== -1 && lastBracket > firstBracket) {
      const candidate = cleaned.slice(firstBracket, lastBracket + 1);
      return JSON.parse(candidate) as T;
    }

    throw new Error('Não foi possível interpretar o formato JSON retornado pela IA.');
  }
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export interface GenerateContentRetryOptions {
  model?: string;
  contents: any;
  config?: any;
  fallbackModels?: string[];
  maxRetriesPerModel?: number;
  initialDelayMs?: number;
}

/**
 * Executa ai.models.generateContent com retry exponencial para erros 503/429
 * e fallback automático entre modelos válidos do Gemini.
 */
export async function generateContentWithRetry(
  ai: GoogleGenAI,
  options: GenerateContentRetryOptions
) {
  const requestedModel =
    options.model && options.model !== 'gemini-3.8-flash'
      ? options.model
      : process.env.GEMINI_MODEL || PRIMARY_GEMINI_MODEL;

  const customFallbacks = options.fallbackModels || DEFAULT_FALLBACK_MODELS;
  const candidateModels = Array.from(
    new Set([requestedModel, ...customFallbacks])
  );
  const maxRetries = options.maxRetriesPerModel ?? 2;
  const initialDelay = options.initialDelayMs ?? 1200;

  let lastError: any = null;

  for (let mIdx = 0; mIdx < candidateModels.length; mIdx++) {
    const currentModel = candidateModels[mIdx];

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model: currentModel,
          contents: options.contents,
          config: options.config,
        });
        return response;
      } catch (err: any) {
        lastError = err;
        const isTransient = isGeminiHighDemandError(err);
        const isNotFound = isModelNotFoundError(err);

        console.warn(
          `[Gemini AI] Falha na chamada com modelo "${currentModel}" (tentativa ${attempt + 1}/${maxRetries + 1}):`,
          err?.message || err
        );

        if (isNotFound) {
          break;
        }

        if (isTransient && attempt < maxRetries) {
          const pauseMs = Math.round(
            initialDelay * Math.pow(1.5, attempt) + Math.random() * 400
          );
          await delay(pauseMs);
          continue;
        }

        if (!isTransient && !isNotFound) {
          throw err;
        }
      }
    }
  }

  throw lastError;
}

export function handleGeminiApiError(error: any, defaultErrorMessage: string) {
  if (isGeminiHighDemandError(error)) {
    return NextResponse.json(
      {
        error: HIGH_DEMAND_ERROR_MESSAGE,
        details:
          error?.message || 'Servidores do Gemini com alta demanda temporária.',
        status: 503,
        code: 'UNAVAILABLE',
        isHighDemand: true,
      },
      { status: 503 }
    );
  }

  const status =
    typeof error?.status === 'number' &&
    error.status >= 400 &&
    error.status < 600
      ? error.status
      : 500;

  return NextResponse.json(
    {
      error: defaultErrorMessage,
      details: error?.message || String(error),
      status,
      code: error?.code,
    },
    { status }
  );
}
