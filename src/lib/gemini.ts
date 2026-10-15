import { GoogleGenAI } from '@google/genai';
import { NextResponse } from 'next/server';

export const HIGH_DEMAND_ERROR_MESSAGE =
  'Os servidores da IA estão com alta demanda momentânea. Por favor, aguarde alguns segundos e tente novamente.';

export const DEFAULT_FALLBACK_MODELS = [
  'gemini-3.8-flash',
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-1.5-flash',
];

export function isGeminiHighDemandError(error: any): boolean {
  if (!error) return false;
  const status = error.status || error.code || error.statusCode;
  if (status === 503 || status === 429 || status === 'UNAVAILABLE' || status === 'RESOURCE_EXHAUSTED') {
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
  return msg.includes('404') || msg.includes('not found') || msg.includes('no longer available');
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
 * Executes ai.models.generateContent with exponential backoff retry for transient errors (503/429/high demand)
 * and automatic fallback to secondary models if high demand persists.
 */
export async function generateContentWithRetry(
  ai: GoogleGenAI,
  options: GenerateContentRetryOptions
) {
  const primaryModel = options.model || process.env.GEMINI_MODEL || 'gemini-3.8-flash';
  const customFallbacks = options.fallbackModels || DEFAULT_FALLBACK_MODELS;

  // Build unique chain of candidate models starting with primaryModel
  const candidateModels = Array.from(new Set([primaryModel, ...customFallbacks]));
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

        // If the model is not found / deprecated (404), switch to the next fallback immediately
        if (isNotFound) {
          break;
        }

        // If high demand / 503 / transient and retries remain for current model, wait and retry
        if (isTransient && attempt < maxRetries) {
          const pauseMs = Math.round(initialDelay * Math.pow(1.5, attempt) + Math.random() * 400);
          console.info(`[Gemini AI] Aguardando ${pauseMs}ms antes de retentar "${currentModel}"...`);
          await delay(pauseMs);
          continue;
        }

        // If non-transient, non-404 error (e.g., bad request 400 with invalid schema), stop immediately
        if (!isTransient && !isNotFound) {
          throw err;
        }

        // Retries exhausted for this model; loop advances to fallback candidate model
      }
    }

    if (mIdx < candidateModels.length - 1) {
      console.warn(`[Gemini AI] Alternando para modelo fallback: "${candidateModels[mIdx + 1]}"...`);
    }
  }

  throw lastError;
}

/**
 * Returns a standardized Next.js JSON error response, providing a user-friendly
 * 503 response if the error was due to high demand or service unavailability.
 */
export function handleGeminiApiError(error: any, defaultErrorMessage: string) {
  if (isGeminiHighDemandError(error)) {
    return NextResponse.json(
      {
        error: HIGH_DEMAND_ERROR_MESSAGE,
        details: error?.message || 'Servidores do Gemini com alta demanda temporária.',
        status: 503,
        code: 'UNAVAILABLE',
        isHighDemand: true,
      },
      { status: 503 }
    );
  }

  const status =
    typeof error?.status === 'number' && error.status >= 400 && error.status < 600
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
