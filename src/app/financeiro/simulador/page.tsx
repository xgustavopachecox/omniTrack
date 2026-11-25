'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { BrazilFinanceIndicators } from '@/lib/types';
import {
  formatBRL,
  formatCompactBRL,
  getRegressiveIrRate,
} from '@/lib/finance';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import {
  Calculator,
  TrendingUp,
  ShieldCheck,
  Percent,
  Landmark,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Info,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Layers,
  Award,
  RefreshCw,
  DollarSign,
  Clock,
} from 'lucide-react';

interface SimulationScenarioResult {
  id: string;
  name: string;
  subtitle: string;
  annualRatePct: number;
  isTaxExempt: boolean;
  irRatePct: number;
  totalInvested: number;
  grossTotal: number;
  grossInterest: number;
  irTaxAmount: number;
  netTotal: number;
  netInterest: number;
  realNetTotal: number; // descontando IPCA acumulado no período
  realNetGain: number; // ganho real acima da inflação sobre o total investido
  badgeColor: string;
  strokeColor: string;
}

export default function FinanceiroSimuladorPage() {
  // Official Indicators State
  const [indicators, setIndicators] = useState<BrazilFinanceIndicators>({
    selic: 14.25,
    cdi: 14.15,
    ipca: 4.87,
    isFallback: false,
    updatedAt: new Date().toISOString(),
    source: 'Carregando...',
  });
  const [loadingIndicators, setLoadingIndicators] = useState<boolean>(true);

  // Simulator Inputs State
  const [initialAmount, setInitialAmount] = useState<number>(5000);
  const [monthlyContribution, setMonthlyContribution] = useState<number>(800);
  const [durationUnit, setDurationUnit] = useState<'months' | 'years'>('years');
  const [durationValue, setDurationValue] = useState<number>(5);
  const [customAnnualRate, setCustomAnnualRate] = useState<number>(12.0);
  const [customIsTaxExempt, setCustomIsTaxExempt] = useState<boolean>(false);
  const [selectedScenarioId, setSelectedScenarioId] =
    useState<string>('cdb_selic');

  // Educational Accordion State
  const [openGlossarySection, setOpenGlossarySection] = useState<string>('triangulo');

  const fetchIndicators = async () => {
    setLoadingIndicators(true);
    try {
      const res = await fetch('/api/finance/indicators');
      if (res.ok) {
        const data: BrazilFinanceIndicators = await res.json();
        setIndicators(data);
      }
    } catch {
      // Keeps safe default indicators
    } finally {
      setLoadingIndicators(false);
    }
  };

  useEffect(() => {
    fetchIndicators();
  }, []);

  const totalMonths = useMemo(() => {
    const raw =
      durationUnit === 'years'
        ? Math.round(durationValue * 12)
        : Math.round(durationValue);
    return Math.max(1, Math.min(600, raw));
  }, [durationUnit, durationValue]);

  // Compound Interest Engine & 5 Side-by-Side Scenarios (useMemo)
  const { scenarios, chartSeries, activeScenario } = useMemo(() => {
    const selic = indicators.selic;
    const cdi = indicators.cdi;
    const ipca = indicators.ipca;

    // 1. Poupança official rule:
    // Se Selic > 8.5% a.a.: 0,5% a.m. + TR (~6,17% a.a. + TR ~0,10% a.m. ≈ 7,44% a.a.; base legal 0,5% a.m. = 6,17% a.a. + TR média 0,08% a.m. -> ~7,17% a.a.)
    // Se Selic <= 8.5% a.a.: 70% da Selic
    const poupancaAnnualRate =
      selic > 8.5
        ? Number((((Math.pow(1 + 0.0058, 12) - 1) * 100)).toFixed(2))
        : Number((selic * 0.7).toFixed(2));

    // 2. Tesouro Selic / CDB 100% CDI
    const cdb100AnnualRate = Number(cdi.toFixed(2));

    // 3. LCI / LCA 90% do CDI (Isento de IR)
    const lci90AnnualRate = Number((cdi * 0.9).toFixed(2));

    // 4. Tesouro IPCA+ (IPCA atual + 6% a.a. composto)
    const ipcaPlus6AnnualRate = Number(
      (((1 + ipca / 100) * (1 + 0.06) - 1) * 100).toFixed(2)
    );

    // 5. Cenário Personalizado
    const customRate = Number(customAnnualRate.toFixed(2));

    const irRateForPeriod = getRegressiveIrRate(totalMonths);
    const monthlyInflationRate = Math.pow(1 + ipca / 100, 1 / 12) - 1;
    const cumulativeInflationFactor = Math.pow(1 + monthlyInflationRate, totalMonths);

    const scenarioConfigs = [
      {
        id: 'poupanca',
        name: 'Poupança Oficial',
        subtitle:
          selic > 8.5
            ? '0,5% a.m. + TR (Isenta de IR)'
            : '70% da Selic (Isenta de IR)',
        annualRatePct: poupancaAnnualRate,
        isTaxExempt: true,
        badgeColor: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
        strokeColor: '#f59e0b',
      },
      {
        id: 'cdb_selic',
        name: 'Tesouro Selic / CDB 100% CDI',
        subtitle: `100% do CDI (${cdi}% a.a.) • IR ${irRateForPeriod}%`,
        annualRatePct: cdb100AnnualRate,
        isTaxExempt: false,
        badgeColor: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
        strokeColor: '#06b6d4',
      },
      {
        id: 'lci_lca',
        name: 'LCI / LCA (90% do CDI)',
        subtitle: `90% do CDI (${lci90AnnualRate}% a.a.) • Isento de IR`,
        annualRatePct: lci90AnnualRate,
        isTaxExempt: true,
        badgeColor: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
        strokeColor: '#10b981',
      },
      {
        id: 'ipca_plus',
        name: 'Tesouro IPCA+ 6% a.a.',
        subtitle: `IPCA (${ipca}%) + 6% • IR ${irRateForPeriod}%`,
        annualRatePct: ipcaPlus6AnnualRate,
        isTaxExempt: false,
        badgeColor: 'bg-violet-500/15 text-violet-300 border-violet-500/30',
        strokeColor: '#8b5cf6',
      },
      {
        id: 'custom',
        name: 'Cenário Personalizado',
        subtitle: `${customRate}% a.a. • ${
          customIsTaxExempt ? 'Isento de IR' : `IR ${irRateForPeriod}%`
        }`,
        annualRatePct: customRate,
        isTaxExempt: customIsTaxExempt,
        badgeColor: 'bg-pink-500/15 text-pink-300 border-pink-500/30',
        strokeColor: '#ec4899',
      },
    ];

    // Calculate month-by-month evolution for all scenarios
    const monthlyRates: Record<string, number> = {};
    const runningGross: Record<string, number> = {};

    scenarioConfigs.forEach((sc) => {
      monthlyRates[sc.id] = Math.pow(1 + sc.annualRatePct / 100, 1 / 12) - 1;
      runningGross[sc.id] = initialAmount;
    });

    const series: Record<string, any>[] = [];
    const step = totalMonths > 120 ? 3 : totalMonths > 48 ? 2 : 1;

    for (let m = 0; m <= totalMonths; m++) {
      const investedSoFar = initialAmount + monthlyContribution * m;
      const irAtMonth = getRegressiveIrRate(Math.max(1, m));

      if (m > 0) {
        scenarioConfigs.forEach((sc) => {
          runningGross[sc.id] =
            runningGross[sc.id] * (1 + monthlyRates[sc.id]) +
            monthlyContribution;
        });
      }

      if (m === 0 || m === totalMonths || m % step === 0) {
        const point: Record<string, any> = {
          month: m,
          label:
            m === 0
              ? 'Início'
              : m % 12 === 0
              ? `${m / 12}a`
              : `${m}m`,
          TotalInvestido: Number(investedSoFar.toFixed(2)),
        };

        scenarioConfigs.forEach((sc) => {
          const gross = runningGross[sc.id];
          const interest = Math.max(0, gross - investedSoFar);
          const tax = sc.isTaxExempt ? 0 : interest * (irAtMonth / 100);
          const net = gross - tax;
          point[sc.id] = Number(net.toFixed(2));
        });

        series.push(point);
      }
    }

    const totalInvestedFinal =
      initialAmount + monthlyContribution * totalMonths;

    const results: SimulationScenarioResult[] = scenarioConfigs.map((sc) => {
      const grossTotal = Number(runningGross[sc.id].toFixed(2));
      const grossInterest = Math.max(
        0,
        Number((grossTotal - totalInvestedFinal).toFixed(2))
      );
      const irRatePct = sc.isTaxExempt ? 0 : irRateForPeriod;
      const irTaxAmount = Number(
        (grossInterest * (irRatePct / 100)).toFixed(2)
      );
      const netTotal = Number((grossTotal - irTaxAmount).toFixed(2));
      const netInterest = Number((netTotal - totalInvestedFinal).toFixed(2));

      // Poder de compra real descontando IPCA acumulado no período
      const realNetTotal = Number(
        (netTotal / cumulativeInflationFactor).toFixed(2)
      );
      const realNetGain = Number(
        (realNetTotal - totalInvestedFinal).toFixed(2)
      );

      return {
        id: sc.id,
        name: sc.name,
        subtitle: sc.subtitle,
        annualRatePct: sc.annualRatePct,
        isTaxExempt: sc.isTaxExempt,
        irRatePct,
        totalInvested: totalInvestedFinal,
        grossTotal,
        grossInterest,
        irTaxAmount,
        netTotal,
        netInterest,
        realNetTotal,
        realNetGain,
        badgeColor: sc.badgeColor,
        strokeColor: sc.strokeColor,
      };
    });

    const active =
      results.find((r) => r.id === selectedScenarioId) || results[1];

    return {
      scenarios: results,
      chartSeries: series,
      activeScenario: active,
    };
  }, [
    indicators,
    initialAmount,
    monthlyContribution,
    totalMonths,
    customAnnualRate,
    customIsTaxExempt,
    selectedScenarioId,
  ]);

  const poupancaScenario = scenarios.find((s) => s.id === 'poupanca');
  const diffVsPoupanca =
    poupancaScenario && activeScenario
      ? activeScenario.netTotal - poupancaScenario.netTotal
      : 0;

  return (
    <div className="space-y-8">
      {/* SECTION A: Painel de Indicadores Reais do Brasil */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Landmark className="h-4 w-4 text-emerald-400" />
            <h2 className="text-sm font-extrabold text-white uppercase tracking-wider">
              Indicadores Oficiais do Brasil (Selic, CDI e IPCA)
            </h2>
            {indicators.isFallback ? (
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[10px] font-bold flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                Estimativa de referência (offline)
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                BrasilAPI / BCB Ativo
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={fetchIndicators}
            disabled={loadingIndicators}
            className="text-xs text-slate-400 hover:text-cyan-400 flex items-center gap-1.5 transition self-start sm:self-auto"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${loadingIndicators ? 'animate-spin' : ''}`}
            />
            Atualizar taxas (Cache 12h)
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: Taxa Selic */}
          <div className="glass-card p-5 rounded-2xl border-l-4 border-l-emerald-500 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-emerald-400 uppercase tracking-wider">
                Taxa Selic Meta
              </span>
              <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 text-[10px] font-bold">
                Base da Economia
              </span>
            </div>
            <p className="text-3xl font-extrabold text-white tracking-tight">
              {indicators.selic.toFixed(2).replace('.', ',')}%{' '}
              <span className="text-sm font-normal text-slate-400">a.a.</span>
            </p>
            <p className="text-xs text-slate-400 leading-relaxed">
              Taxa básica de juros definida pelo Copom/BCB; remunera o Tesouro Selic e dita o retorno da renda fixa.
            </p>
          </div>

          {/* Card 2: Taxa CDI */}
          <div className="glass-card p-5 rounded-2xl border-l-4 border-l-cyan-500 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-cyan-400 uppercase tracking-wider">
                Taxa DI (CDI)
              </span>
              <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 text-[10px] font-bold">
                Benchmark Bancário
              </span>
            </div>
            <p className="text-3xl font-extrabold text-white tracking-tight">
              {indicators.cdi.toFixed(2).replace('.', ',')}%{' '}
              <span className="text-sm font-normal text-slate-400">a.a.</span>
            </p>
            <p className="text-xs text-slate-400 leading-relaxed">
              Principal referência de rentabilidade para CDBs, Caixinhas, LCIs, LCAs e contas remuneradas.
            </p>
          </div>

          {/* Card 3: IPCA 12m */}
          <div className="glass-card p-5 rounded-2xl border-l-4 border-l-amber-500 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-amber-400 uppercase tracking-wider">
                IPCA (Inflação 12m)
              </span>
              <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 text-[10px] font-bold">
                Poder de Compra
              </span>
            </div>
            <p className="text-3xl font-extrabold text-white tracking-tight">
              {indicators.ipca.toFixed(2).replace('.', ',')}%{' '}
              <span className="text-sm font-normal text-slate-400">a.a.</span>
            </p>
            <p className="text-xs text-slate-400 leading-relaxed">
              Índice oficial da inflação no Brasil; seu investimento precisa render acima do IPCA para ter ganho real.
            </p>
          </div>
        </div>
      </div>

      {/* SECTION B: Simulador de Juros Compostos e Comparador */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Interactive Sliders & Inputs (4 cols) */}
        <div className="lg:col-span-4 glass-card p-5 sm:p-6 rounded-2xl space-y-5 flex flex-col justify-between">
          <div className="space-y-5">
            <div className="border-b border-slate-800 pb-3">
              <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                <Calculator className="h-4 w-4 text-cyan-400" />
                Parâmetros da Simulação
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Ajuste nos controles deslizantes ou digite os valores exatos.
              </p>
            </div>

            {/* Input 1: Valor Inicial (R$) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-300">
                  Valor Inicial (R$)
                </label>
                <span className="text-xs font-extrabold text-cyan-400">
                  {formatBRL(initialAmount)}
                </span>
              </div>
              <input
                type="number"
                min={0}
                max={10000000}
                step={100}
                value={initialAmount}
                onChange={(e) =>
                  setInitialAmount(Math.max(0, Number(e.target.value || 0)))
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm font-bold text-white focus:outline-none focus:border-cyan-500"
              />
              <input
                type="range"
                min={0}
                max={100000}
                step={500}
                value={Math.min(100000, initialAmount)}
                onChange={(e) => setInitialAmount(Number(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
            </div>

            {/* Input 2: Aporte Mensal (R$) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-300">
                  Aporte Mensal (R$)
                </label>
                <span className="text-xs font-extrabold text-emerald-400">
                  {formatBRL(monthlyContribution)} / mês
                </span>
              </div>
              <input
                type="number"
                min={0}
                max={1000000}
                step={50}
                value={monthlyContribution}
                onChange={(e) =>
                  setMonthlyContribution(Math.max(0, Number(e.target.value || 0)))
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm font-bold text-white focus:outline-none focus:border-emerald-500"
              />
              <input
                type="range"
                min={0}
                max={15000}
                step={100}
                value={Math.min(15000, monthlyContribution)}
                onChange={(e) => setMonthlyContribution(Number(e.target.value))}
                className="w-full accent-emerald-400 cursor-pointer"
              />
            </div>

            {/* Input 3: Tempo de Aplicação (Meses ou Anos) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-300">
                  Tempo de Aplicação
                </label>
                <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      if (durationUnit === 'years') {
                        setDurationUnit('months');
                        setDurationValue(totalMonths);
                      }
                    }}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition ${
                      durationUnit === 'months'
                        ? 'bg-cyan-500/20 text-cyan-300'
                        : 'text-slate-400'
                    }`}
                  >
                    Meses
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (durationUnit === 'months') {
                        setDurationUnit('years');
                        setDurationValue(Math.max(1, Math.round(totalMonths / 12)));
                      }
                    }}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition ${
                      durationUnit === 'years'
                        ? 'bg-cyan-500/20 text-cyan-300'
                        : 'text-slate-400'
                    }`}
                  >
                    Anos
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min={1}
                  max={durationUnit === 'years' ? 50 : 600}
                  value={durationValue}
                  onChange={(e) =>
                    setDurationValue(Math.max(1, Number(e.target.value || 1)))
                  }
                  className="w-24 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm font-bold text-white focus:outline-none focus:border-cyan-500"
                />
                <span className="text-xs text-slate-300 font-semibold">
                  {durationUnit === 'years'
                    ? `${durationValue} ${
                        durationValue === 1 ? 'ano' : 'anos'
                      } (${totalMonths} meses)`
                    : `${totalMonths} ${totalMonths === 1 ? 'mês' : 'meses'}`}
                </span>
              </div>

              <input
                type="range"
                min={1}
                max={durationUnit === 'years' ? 35 : 360}
                step={1}
                value={Math.min(
                  durationUnit === 'years' ? 35 : 360,
                  durationValue
                )}
                onChange={(e) => setDurationValue(Number(e.target.value))}
                className="w-full accent-violet-400 cursor-pointer"
              />
            </div>

            {/* Input 4: Taxa Personalizada Opcional (% a.a.) */}
            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-pink-300 flex items-center gap-1.5">
                  <Percent className="h-3.5 w-3.5 text-pink-400" />
                  Taxa do Cenário Personalizado (% a.a.)
                </label>
                <span className="text-xs font-extrabold text-pink-400">
                  {customAnnualRate.toFixed(1)}% a.a.
                </span>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="number"
                  step="0.1"
                  min={0.1}
                  max={100}
                  value={customAnnualRate}
                  onChange={(e) =>
                    setCustomAnnualRate(
                      Math.max(0.1, Number(e.target.value || 1))
                    )
                  }
                  className="w-24 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs font-bold text-white focus:outline-none focus:border-pink-500"
                />
                <input
                  type="range"
                  min={1}
                  max={30}
                  step={0.5}
                  value={Math.min(30, customAnnualRate)}
                  onChange={(e) => setCustomAnnualRate(Number(e.target.value))}
                  className="flex-1 accent-pink-400 cursor-pointer"
                />
              </div>

              <label className="flex items-center gap-2 text-[11px] text-slate-300 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={customIsTaxExempt}
                  onChange={(e) => setCustomIsTaxExempt(e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-slate-700 bg-slate-900 text-pink-500"
                />
                <span>Simular cenário personalizado como Isento de IR</span>
              </label>
            </div>
          </div>

          {/* Active IR Regressive Bracket Note */}
          <div className="p-3 rounded-xl bg-slate-950/90 border border-slate-800/80 flex items-center justify-between text-xs">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-cyan-400" />
              Alíquota IR Regressivo ({totalMonths}m):
            </span>
            <span className="font-extrabold text-cyan-400">
              {getRegressiveIrRate(totalMonths)}% sobre o lucro
            </span>
          </div>
        </div>

        {/* Right Column: Detailed Results & Compound Evolution Chart (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Scenario Selector Pills */}
          <div className="glass-card p-5 sm:p-6 rounded-2xl space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-emerald-400" />
                  Resultado Detalhado: {activeScenario.name}
                </h3>
                <p className="text-xs text-slate-400">
                  Clique em qualquer um dos 5 cenários abaixo para inspecionar os números líquidos e a curva.
                </p>
              </div>
              <span
                className={`px-3 py-1 rounded-full border text-xs font-extrabold self-start sm:self-auto ${activeScenario.badgeColor}`}
              >
                {activeScenario.annualRatePct.toFixed(2)}% a.a.
              </span>
            </div>

            {/* 5 Detailed Output KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">
                  1. Total Investido (Bolso)
                </span>
                <p className="text-base font-extrabold text-white mt-1">
                  {formatBRL(activeScenario.totalInvested)}
                </p>
                <span className="text-[10px] text-slate-500 block mt-0.5">
                  Inicial + {totalMonths} aportes
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">
                  2. Ganho em Juros (Bruto)
                </span>
                <p className="text-base font-extrabold text-cyan-400 mt-1">
                  + {formatBRL(activeScenario.grossInterest)}
                </p>
                <span className="text-[10px] text-slate-500 block mt-0.5">
                  Efeito juros compostos
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">
                  3. Imposto de Renda Est.
                </span>
                <p className="text-base font-extrabold text-rose-400 mt-1">
                  {activeScenario.isTaxExempt
                    ? 'R$ 0,00 (Isento)'
                    : `- ${formatBRL(activeScenario.irTaxAmount)}`}
                </p>
                <span className="text-[10px] text-slate-500 block mt-0.5">
                  {activeScenario.isTaxExempt
                    ? 'Isenção legal PF'
                    : `Tabela regressiva (${activeScenario.irRatePct}%)`}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-500/40">
                <span className="text-[10px] font-extrabold text-emerald-300 uppercase block">
                  4. Valor Líquido Final
                </span>
                <p className="text-base font-extrabold text-emerald-400 mt-1">
                  {formatBRL(activeScenario.netTotal)}
                </p>
                <span className="text-[10px] text-emerald-300/80 block mt-0.5">
                  Lucro líq: +{formatBRL(activeScenario.netInterest)}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-violet-950/30 border border-violet-500/40">
                <span className="text-[10px] font-extrabold text-violet-300 uppercase block">
                  5. Poder Real (Desc. IPCA)
                </span>
                <p className="text-base font-extrabold text-violet-300 mt-1">
                  {formatBRL(activeScenario.realNetTotal)}
                </p>
                <span className="text-[10px] text-violet-300/80 block mt-0.5">
                  Ganho real: {activeScenario.realNetGain >= 0 ? '+' : ''}
                  {formatCompactBRL(activeScenario.realNetGain)}
                </span>
              </div>
            </div>

            {/* Evolution Chart (AreaChart) */}
            <div className="space-y-2 pt-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="text-xs font-bold text-slate-300">
                  Curva de Evolução Patrimonial: Total Aportado vs Patrimônio Líquido Acumulado
                </span>
                {activeScenario.id !== 'poupanca' && (
                  <span
                    className={`text-xs font-extrabold ${
                      diffVsPoupanca >= 0 ? 'text-emerald-400' : 'text-amber-400'
                    }`}
                  >
                    {diffVsPoupanca >= 0
                      ? `+ ${formatBRL(diffVsPoupanca)} acima da Poupança`
                      : `${formatBRL(diffVsPoupanca)} vs Poupança`}
                  </span>
                )}
              </div>

              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={chartSeries}
                    margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="colorActive" x1="0" y1="0" x2="0" y2="1">
                        <stop
                          offset="5%"
                          stopColor={activeScenario.strokeColor}
                          stopOpacity={0.35}
                        />
                        <stop
                          offset="95%"
                          stopColor={activeScenario.strokeColor}
                          stopOpacity={0.0}
                        />
                      </linearGradient>
                      <linearGradient id="colorInvested" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#64748b" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#64748b" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#1e293b"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="label"
                      stroke="#94a3b8"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="#94a3b8"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) =>
                        v >= 1000000
                          ? `R$${(v / 1000000).toFixed(1)}M`
                          : v >= 1000
                          ? `R$${(v / 1000).toFixed(0)}k`
                          : `R$${v}`
                      }
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderColor: '#1e293b',
                        borderRadius: '0.75rem',
                        fontSize: '12px',
                        color: '#f8fafc',
                      }}
                      formatter={(val: any, name: any) => [
                        formatBRL(Number(val)),
                        String(name),
                      ]}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Area
                      type="monotone"
                      dataKey="TotalInvestido"
                      name="Total Investido (Do Bolso)"
                      stroke="#94a3b8"
                      strokeWidth={2}
                      strokeDasharray="4 4"
                      fillOpacity={1}
                      fill="url(#colorInvested)"
                    />
                    <Area
                      type="monotone"
                      dataKey="poupanca"
                      name="Poupança (Líquido)"
                      stroke="#f59e0b"
                      strokeWidth={1.8}
                      fillOpacity={0}
                    />
                    <Area
                      type="monotone"
                      dataKey={activeScenario.id}
                      name={`${activeScenario.name} (Líquido)`}
                      stroke={activeScenario.strokeColor}
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#colorActive)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Side-by-Side Automatic Comparison Table / Cards of All 5 Scenarios */}
          <div className="glass-card p-5 sm:p-6 rounded-2xl space-y-4">
            <div>
              <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                <Layers className="h-4 w-4 text-cyan-400" />
                Comparação Automática Lado a Lado (5 Cenários)
              </h3>
              <p className="text-xs text-slate-400">
                Clique em um card para destacá-lo no gráfico acima. Todos já descontam o IR regressivo quando aplicável.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              {scenarios.map((sc) => {
                const isSelected = sc.id === activeScenario.id;
                const bestNet = Math.max(...scenarios.map((s) => s.netTotal));
                const isBest = sc.netTotal === bestNet;

                return (
                  <div
                    key={sc.id}
                    onClick={() => setSelectedScenarioId(sc.id)}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between space-y-3 ${
                      isSelected
                        ? 'bg-slate-900 border-cyan-500 ring-1 ring-cyan-500/40 shadow-lg shadow-cyan-500/10'
                        : 'bg-slate-950/70 border-slate-800/90 hover:border-slate-700'
                    }`}
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-1">
                        <span
                          className="h-2.5 w-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: sc.strokeColor }}
                        />
                        {isBest && (
                          <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[9px] font-extrabold uppercase">
                            Maior Retorno
                          </span>
                        )}
                      </div>
                      <h4 className="text-xs font-extrabold text-white leading-snug">
                        {sc.name}
                      </h4>
                      <p className="text-[10px] text-slate-400">{sc.subtitle}</p>
                    </div>

                    <div className="space-y-1 pt-2 border-t border-slate-800/80">
                      <span className="text-[10px] text-slate-400 block">
                        Valor Líquido Final:
                      </span>
                      <p className="text-sm font-extrabold text-emerald-400">
                        {formatBRL(sc.netTotal)}
                      </p>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
                        <span>Juros líq:</span>
                        <span className="text-slate-200 font-bold">
                          +{formatCompactBRL(sc.netInterest)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span>IR:</span>
                        <span className="text-rose-400 font-medium">
                          {sc.isTaxExempt
                            ? 'Isento'
                            : `-${formatCompactBRL(sc.irTaxAmount)}`}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* SECTION C: Guia Essencial "Entendendo Onde Investir" */}
      <div className="glass-card p-5 sm:p-6 rounded-2xl space-y-6 border-t-4 border-t-cyan-500">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-300 text-[10px] font-extrabold uppercase">
                Educação Financeira Prática
              </span>
            </div>
            <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-cyan-400" />
              Guia Essencial: Entendendo Onde Investir
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Fundamentos diretos ao ponto para você montar sua carteira com segurança, liquidez e rentabilidade real.
            </p>
          </div>

          {/* Section Switcher Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: 'triangulo', label: '1. Triângulo dos Investimentos' },
              { id: 'ordem', label: '2. Ordem Inteligente de Aplicação' },
              { id: 'glossario', label: '3. Glossário & Tabela de IR/IOF' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setOpenGlossarySection(tab.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition border ${
                  openGlossarySection === tab.id
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                    : 'bg-slate-950/70 text-slate-400 border-slate-800 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* 1. Triângulo dos Investimentos */}
        {openGlossarySection === 'triangulo' && (
          <div className="space-y-4 animate-fadeIn">
            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
              <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                Por que não existe um investimento perfeito nos 3 pilares ao mesmo tempo?
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Todo ativo financeiro equilibra três forças: <strong>Segurança</strong>, <strong>Liquidez</strong> e <strong>Rentabilidade</strong>. Na prática, você sempre consegue escolher no máximo <strong>duas</strong> delas em um mesmo produto abrindo mão da terceira — por isso diversificamos por objetivos!
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-slate-950/70 border border-emerald-500/30 space-y-2">
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 text-[10px] font-extrabold uppercase">
                  Pilar 1 • Segurança
                </span>
                <h4 className="text-sm font-extrabold text-white">
                  Baixo risco de perda
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Garantia do Tesouro Nacional (risco soberano, o mais seguro do país) ou cobertura do <strong>FGC até R$ 250 mil</strong> em CDBs, LCIs e LCAs.
                </p>
                <p className="text-[11px] text-emerald-400 font-semibold pt-1">
                  Exemplos: Tesouro Selic, CDB de grande banco.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950/70 border border-cyan-500/30 space-y-2">
                <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 text-[10px] font-extrabold uppercase">
                  Pilar 2 • Liquidez
                </span>
                <h4 className="text-sm font-extrabold text-white">
                  Velocidade de resgate em R$
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Capacidade de transformar o título em dinheiro na conta no mesmo dia (D+0 ou D+1) sem perder valor de mercado. Essencial para a <strong>Reserva de Emergência</strong>.
                </p>
                <p className="text-[11px] text-cyan-400 font-semibold pt-1">
                  Se tem alta Segurança + Liquidez, a rentabilidade é moderada (100% CDI).
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950/70 border border-violet-500/30 space-y-2">
                <span className="px-2.5 py-0.5 rounded-full bg-violet-500/15 text-violet-300 text-[10px] font-extrabold uppercase">
                  Pilar 3 • Rentabilidade
                </span>
                <h4 className="text-sm font-extrabold text-white">
                  Potencial de multiplicação
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Para buscar retornos maiores (como IPCA + 6%, LCI fechada por 2 anos, FIIs ou Ações), você abre mão da liquidez imediata ou aceita oscilação no curto prazo.
                </p>
                <p className="text-[11px] text-violet-400 font-semibold pt-1">
                  Alerta: Promessas de altíssimo retorno com risco zero e liquidez diária são golpes.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 2. Ordem Inteligente de Aplicação */}
        {openGlossarySection === 'ordem' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-fadeIn">
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-rose-500/30 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded-lg bg-rose-500/20 text-rose-300 text-[10px] font-extrabold">
                  PASSO 1
                </span>
                <span className="text-xs font-bold text-rose-400">Prioridade Zero</span>
              </div>
              <h4 className="text-sm font-extrabold text-white">
                Quitar Dívidas Caras
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Nenhum investimento seguro ganha dos juros do rotativo do cartão ou cheque especial (que passam de 300% a.a.). Quite ou renegocie dívidas com juros altos antes de investir.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/80 border border-emerald-500/30 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-300 text-[10px] font-extrabold">
                  PASSO 2
                </span>
                <span className="text-xs font-bold text-emerald-400">Alvo: 6 a 12 meses</span>
              </div>
              <h4 className="text-sm font-extrabold text-white">
                Reserva de Emergência
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Acumule de 6 a 12 vezes seu custo mensal em <strong>CDB 100% do CDI com liquidez diária</strong> (de banco sólido) ou <strong>Tesouro Selic</strong>. Paz de espírito para imprevistos.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/80 border border-cyan-500/30 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded-lg bg-cyan-500/20 text-cyan-300 text-[10px] font-extrabold">
                  PASSO 3
                </span>
                <span className="text-xs font-bold text-cyan-400">Prazo: 1 a 5 anos</span>
              </div>
              <h4 className="text-sm font-extrabold text-white">
                Metas de Médio Prazo
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Para objetivos com data marcada (trocar de carro, entrada de imóvel, casamento): use <strong>LCI / LCA</strong> (isentas de IR) ou CDBs com vencimento casado com a data da sua meta.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/80 border border-violet-500/30 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded-lg bg-violet-500/20 text-violet-300 text-[10px] font-extrabold">
                  PASSO 4
                </span>
                <span className="text-xs font-bold text-violet-400">Prazo: 5+ anos</span>
              </div>
              <h4 className="text-sm font-extrabold text-white">
                Longo Prazo & Liberdade
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Construção de aposentadoria e renda passiva: <strong>Tesouro IPCA+</strong> (garante ganho real acima da inflação), <strong>FIIs</strong> (aluguéis mensais isentos), <strong>Ações</strong> de boas empresas e <strong>ETFs</strong>.
              </p>
            </div>
          </div>
        )}

        {/* 3. Glossário Prático & Tabela Regressiva de IR / IOF */}
        {openGlossarySection === 'glossario' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                {
                  term: 'FGC (Fundo Garantidor de Créditos)',
                  tag: 'Proteção',
                  desc: 'Garante até R$ 250 mil por CPF e por instituição financeira (com teto global de R$ 1 milhão a cada 4 anos) em CDB, LCI, LCA e Poupança caso o banco quebre.',
                },
                {
                  term: 'Tesouro Direto (Selic, Prefixado, IPCA+)',
                  tag: 'Renda Fixa Soberana',
                  desc: 'Títulos públicos do Governo Federal. Tesouro Selic segue a taxa básica (ideal p/ reserva); Prefixado trava uma taxa fixa; IPCA+ protege da inflação mais juros reais.',
                },
                {
                  term: 'CDB (Certificado de Depósito Bancário)',
                  tag: 'Renda Fixa Bancária',
                  desc: 'Você empresta dinheiro ao banco em troca de juros (ex: 100% do CDI). Conta com garantia do FGC e sofre incidência da tabela regressiva de IR apenas sobre o lucro.',
                },
                {
                  term: 'LCI e LCA (Letras de Crédito Imob. / Agro)',
                  tag: 'Isentas de IR',
                  desc: 'Títulos emitidos por bancos lastreados no setor imobiliário ou agronegócio. São 100% isentos de Imposto de Renda para Pessoa Física e contam com garantia do FGC.',
                },
                {
                  term: 'FIIs (Fundos de Investimento Imobiliário)',
                  tag: 'Renda Variável / Passiva',
                  desc: 'Cotas negociadas na bolsa que investem em galpões logísticos, shoppings, lajes ou títulos (CRIs). Distribuem rendimentos mensais isentos de IR na conta.',
                },
                {
                  term: 'Ações & ETFs (Fundos de Índice)',
                  tag: 'Renda Variável',
                  desc: 'Ações são pequenas frações de empresas listadas na B3. ETFs (como IVVB11 ou BOVA11) são cestas diversificadas que replicam índices inteiros com uma única cota.',
                },
              ].map((item) => (
                <div
                  key={item.term}
                  className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-xs font-extrabold text-white">
                      {item.term}
                    </h4>
                    <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-[10px] font-bold text-cyan-400 shrink-0">
                      {item.tag}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>

            {/* Regressive IR & IOF Table */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-slate-950/90 border border-slate-800 space-y-3">
                <h4 className="text-xs font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
                  <Percent className="h-3.5 w-3.5 text-cyan-400" />
                  Tabela Regressiva do Imposto de Renda (Renda Fixa)
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">
                      Até 180 dias
                    </span>
                    <span className="text-sm font-extrabold text-rose-400">
                      22,5%
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">
                      181 a 360 dias
                    </span>
                    <span className="text-sm font-extrabold text-amber-400">
                      20,0%
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">
                      361 a 720 dias
                    </span>
                    <span className="text-sm font-extrabold text-cyan-400">
                      17,5%
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-900 border border-emerald-500/30">
                    <span className="text-[10px] text-slate-400 block">
                      Acima de 720 dias
                    </span>
                    <span className="text-sm font-extrabold text-emerald-400">
                      15,0%
                    </span>
                  </div>
                </div>
                <p className="text-[11px] text-slate-400">
                  * O IR e o IOF incidem <strong>somente sobre o rendimento (lucro)</strong>, nunca sobre o valor principal que você depositou.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/90 border border-slate-800 space-y-2.5 flex flex-col justify-between">
                <div className="space-y-1.5">
                  <h4 className="text-xs font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
                    <Info className="h-3.5 w-3.5 text-amber-400" />
                    Como funciona o IOF nos primeiros 30 dias?
                  </h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    O <strong>IOF (Imposto sobre Operações Financeiras)</strong> só é cobrado se você resgatar um CDB ou Tesouro Direto antes de completar <strong>30 dias</strong> da aplicação. Ele começa em 96% do lucro no 1º dia e cai todo dia até chegar a <strong>0% (isento) no 30º dia</strong>.
                  </p>
                </div>
                <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-300 font-semibold">
                  Dica prática: Deixe o dinheiro aplicado por pelo menos 30 dias para eliminar 100% do IOF. LCI e LCA já são isentas de IR desde o primeiro dia.
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
