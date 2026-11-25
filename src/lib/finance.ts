import {
  FinancialTransactionType,
  FinancialVisionHorizon,
  FinancialVisionStatus,
  PaymentMethodType,
} from './types';

export function formatBRL(value: number): string {
  const num = Number.isFinite(value) ? value : 0;
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

export function formatCompactBRL(value: number): string {
  const num = Number.isFinite(value) ? value : 0;
  if (Math.abs(num) >= 1_000_000) {
    return `R$ ${(num / 1_000_000).toLocaleString('pt-BR', {
      minimumFractionDigits: 1,
      maximumFractionDigits: 2,
    })} mi`;
  }
  if (Math.abs(num) >= 10_000) {
    return `R$ ${(num / 1_000).toLocaleString('pt-BR', {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    })} mil`;
  }
  return formatBRL(num);
}

export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export const EXPENSE_CATEGORIES = [
  'Alimentação',
  'Moradia',
  'Transporte',
  'Lazer',
  'Saúde',
  'Estudos',
  'Assinaturas',
  'Compras',
  'Investimentos',
  'Outros',
] as const;

export const INCOME_CATEGORIES = [
  'Salário',
  'Freelance / Extra',
  'Rendimentos',
  'Vendas',
  'Reembolso',
  'Premiação / Bônus',
  'Outros',
] as const;

export const ALL_FINANCIAL_CATEGORIES = Array.from(
  new Set([...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES])
);

export const PAYMENT_METHODS: PaymentMethodType[] = [
  'Pix',
  'Crédito',
  'Débito',
  'Dinheiro',
  'Boleto',
  'Transferência',
];

export const CATEGORY_COLORS: Record<string, string> = {
  Alimentação: '#f59e0b',
  Moradia: '#3b82f6',
  Transporte: '#06b6d4',
  Lazer: '#ec4899',
  Saúde: '#10b981',
  Estudos: '#8b5cf6',
  Assinaturas: '#6366f1',
  Compras: '#f97316',
  Investimentos: '#14b8a6',
  Salário: '#10b981',
  'Freelance / Extra': '#06b6d4',
  Rendimentos: '#34d399',
  Vendas: '#38bdf8',
  Reembolso: '#a78bfa',
  'Premiação / Bônus': '#fbbf24',
  Outros: '#64748b',
};

export const GOAL_CATEGORIES = [
  'Reserva de Emergência',
  'Viagem / Férias',
  'Veículo / Moto / Carro',
  'Imóvel / Casa Própria',
  'Educação / Concurso',
  'Equipamentos / Setup',
  'Liberdade Financeira',
  'Outro Objetivo',
];

export const GOAL_COLOR_PALETTE = [
  { label: 'Ciano', value: '#06b6d4' },
  { label: 'Esmeralda', value: '#10b981' },
  { label: 'Violeta', value: '#8b5cf6' },
  { label: 'Âmbar', value: '#f59e0b' },
  { label: 'Azul', value: '#3b82f6' },
  { label: 'Rosa', value: '#ec4899' },
  { label: 'Laranja', value: '#f97316' },
];

export const VISION_HORIZONS: {
  value: FinancialVisionHorizon;
  label: string;
  subtitle: string;
  badgeClass: string;
}[] = [
  {
    value: 'short',
    label: 'Curto Prazo',
    subtitle: 'Até 1 ano',
    badgeClass: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
  },
  {
    value: 'medium',
    label: 'Médio Prazo',
    subtitle: '1 a 5 anos',
    badgeClass: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
  },
  {
    value: 'long',
    label: 'Longo Prazo',
    subtitle: '5+ anos',
    badgeClass: 'bg-violet-500/15 text-violet-300 border-violet-500/30',
  },
  {
    value: 'freedom',
    label: 'Independência Financeira / Sonhos Grandes',
    subtitle: 'Liberdade & Legado',
    badgeClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  },
];

export const VISION_STATUS_META: Record<
  FinancialVisionStatus,
  { label: string; badgeClass: string; dotClass: string }
> = {
  planning: {
    label: 'Planejando',
    badgeClass: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    dotClass: 'bg-amber-400',
  },
  in_progress: {
    label: 'Em andamento',
    badgeClass: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
    dotClass: 'bg-cyan-400',
  },
  achieved: {
    label: 'Conquistado',
    badgeClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    dotClass: 'bg-emerald-400',
  },
};

export const MONTH_NAMES_PT = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

export const MONTH_SHORT_PT = [
  'Jan',
  'Fev',
  'Mar',
  'Abr',
  'Mai',
  'Jun',
  'Jul',
  'Ago',
  'Set',
  'Out',
  'Nov',
  'Dez',
];

export function getCategoriesForType(type: FinancialTransactionType): string[] {
  return type === 'income' ? [...INCOME_CATEGORIES] : [...EXPENSE_CATEGORIES];
}

export function getRegressiveIrRate(months: number): number {
  const approximateDays = months * 30;
  if (approximateDays <= 180) return 22.5;
  if (approximateDays <= 360) return 20.0;
  if (approximateDays <= 720) return 17.5;
  return 15.0;
}
