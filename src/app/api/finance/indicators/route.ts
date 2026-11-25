import { NextResponse } from 'next/server';
import { BrazilFinanceIndicators } from '@/lib/types';

export const revalidate = 43200; // 12 horas

const FALLBACK_INDICATORS: BrazilFinanceIndicators = {
  selic: 14.25,
  cdi: 14.15,
  ipca: 4.87,
  isFallback: true,
  updatedAt: new Date().toISOString(),
  source: 'Estimativa de Referência (Fallback Local)',
};

export async function GET() {
  try {
    const response = await fetch('https://brasilapi.com.br/api/taxas/v1', {
      next: { revalidate: 43200 },
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`BrasilAPI responded with status ${response.status}`);
    }

    const data = await response.json();

    if (!Array.isArray(data)) {
      throw new Error('Formato inesperado retornado pela BrasilAPI');
    }

    let selic: number | null = null;
    let cdi: number | null = null;
    let ipca: number | null = null;

    for (const item of data) {
      const name = String(item?.nome || '').toUpperCase().trim();
      const val = Number(item?.valor);
      if (!Number.isFinite(val)) continue;

      if (name === 'SELIC') selic = val;
      else if (name === 'CDI') cdi = val;
      else if (name === 'IPCA') ipca = val;
    }

    const finalSelic = selic ?? FALLBACK_INDICATORS.selic;
    const finalCdi = cdi ?? Number(Math.max(0, finalSelic - 0.1).toFixed(2));
    const finalIpca = ipca ?? FALLBACK_INDICATORS.ipca;

    const payload: BrazilFinanceIndicators = {
      selic: Number(finalSelic.toFixed(2)),
      cdi: Number(finalCdi.toFixed(2)),
      ipca: Number(finalIpca.toFixed(2)),
      isFallback: selic === null && cdi === null && ipca === null,
      updatedAt: new Date().toISOString(),
      source: 'BrasilAPI / Banco Central do Brasil',
    };

    return NextResponse.json(payload, { status: 200 });
  } catch (error) {
    console.warn(
      'Aviso: Não foi possível consultar BrasilAPI em tempo real, utilizando taxas de referência (fallback):',
      error
    );
    return NextResponse.json(
      {
        ...FALLBACK_INDICATORS,
        updatedAt: new Date().toISOString(),
      },
      { status: 200 }
    );
  }
}
