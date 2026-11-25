import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';
import {
  generateContentWithRetry,
  handleGeminiApiError,
  parseGeminiJson,
  PRIMARY_GEMINI_MODEL,
} from '@/lib/gemini';

const MAX_VERCEL_PDF_BYTES = 4.5 * 1024 * 1024; // 4.5 MB limite da Vercel Serverless

const tafReqSchema = z.object({
  modality: z.string(),
  target_value: z.number(),
  unit: z.string(),
});

const syllabusSubjectSchema = z.object({
  subject_name: z.string(),
  topics: z.array(z.string()),
});

const parseEditalResponseSchema = z.object({
  contest_title: z.string(),
  institution: z.string(),
  salary: z.string().optional().default('A consultar no edital'),
  target_date: z.string().optional().default('2026-12-01'),
  registration_deadline: z.string().optional().default('A consultar'),
  summary_points: z.array(z.string()).optional().default([]),
  taf_requirements: z.array(tafReqSchema).optional().default([]),
  syllabus: z.array(syllabusSubjectSchema).optional().default([]),
});

export async function POST(req: NextRequest) {
  try {
    let pdfBase64: string | null = null;
    const pdfMimeType = 'application/pdf';
    let rawText: string | null = null;
    let targetRoles = 'Cargos Principais do Edital';

    const contentType = req.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const rolesInput = formData.get('target_roles') || formData.get('targetRoles');
      if (typeof rolesInput === 'string' && rolesInput.trim()) {
        targetRoles = rolesInput.trim();
      }

      const textInput = formData.get('raw_text') || formData.get('rawText');
      if (typeof textInput === 'string' && textInput.trim()) {
        rawText = textInput.trim();
      }

      const file =
        formData.get('file') || formData.get('pdf') || formData.get('editalPdf');
      if (file && file instanceof Blob && file.size > 0) {
        if (file.size > MAX_VERCEL_PDF_BYTES) {
          return NextResponse.json(
            {
              error:
                'O arquivo PDF excede o limite de 4.5 MB da Vercel. Envie um PDF menor (com apenas as páginas do conteúdo programático) ou cole o texto do edital.',
            },
            { status: 413 }
          );
        }

        const fileName =
          'name' in file && typeof (file as File).name === 'string'
            ? (file as File).name.toLowerCase()
            : '';
        const rawMime = (file.type || '').toLowerCase();
        const isValidPdf =
          fileName.endsWith('.pdf') ||
          rawMime.includes('pdf') ||
          rawMime === 'application/octet-stream' ||
          rawMime === '';

        if (!isValidPdf) {
          return NextResponse.json(
            {
              error:
                'Formato de arquivo inválido. Por favor, selecione um arquivo com extensão .pdf válido.',
            },
            { status: 400 }
          );
        }

        const arrayBuffer = await file.arrayBuffer();
        pdfBase64 = Buffer.from(arrayBuffer).toString('base64');
      }
    } else {
      const body = await req.json().catch(() => ({}));
      if (body.target_roles || body.targetRoles) {
        targetRoles = body.target_roles || body.targetRoles;
      }
      if (body.raw_text || body.rawText) {
        rawText = body.raw_text || body.rawText;
      }
      const rawPdfStr =
        body.pdfBase64 || body.file || body.pdf || body.editalPdf;
      if (typeof rawPdfStr === 'string' && rawPdfStr.trim()) {
        pdfBase64 = rawPdfStr.includes(';base64,')
          ? rawPdfStr.split(';base64,')[1]
          : rawPdfStr.trim();
      }
    }

    if (!pdfBase64 && !rawText) {
      return NextResponse.json(
        {
          error:
            'É necessário fornecer um arquivo PDF do edital ou colar o texto bruto.',
        },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey || apiKey === 'your_google_ai_studio_gemini_api_key') {
      const sampleTitle =
        targetRoles.length > 25
          ? `${targetRoles.substring(0, 25)}...`
          : targetRoles;
      return NextResponse.json({
        contest_title: `Concurso Público - ${sampleTitle}`,
        institution: 'Cebraspe / FGV',
        salary: 'R$ 7.850,00',
        target_date: '2026-11-29',
        registration_deadline: '2026-10-15',
        summary_points: [
          'Vagas: 200 imediatas + Cadastro de Reserva',
          'Fases: Prova Objetiva + Redação Discursiva + TAF',
          'Regime: Estatutário com estabilidade após estágio probatório',
        ],
        taf_requirements: [
          {
            modality: 'Corrida de 12 minutos',
            target_value: 2400.0,
            unit: 'metros',
          },
          { modality: 'Barra Fixa', target_value: 5.0, unit: 'reps' },
          { modality: 'Abdominal Remador', target_value: 30.0, unit: 'reps' },
        ],
        syllabus: [
          {
            subject_name: 'Língua Portuguesa',
            topics: [
              'Compreensão e interpretação de textos',
              'Tipologia e estruturação textual',
              'Ortografia oficial e acentuação gráfica',
              'Sintaxe da oração e do período',
              'Emprego do sinal indicativo de crase',
            ],
          },
          {
            subject_name: 'Direito Constitucional',
            topics: [
              'Direitos e garantias fundamentais (Art. 5º)',
              'Nacionalidade e direitos políticos',
              'Organização do Estado e Administração Pública',
              'Poder Executivo e Segurança Pública (Art. 144)',
            ],
          },
          {
            subject_name: 'Direito Administrativo',
            topics: [
              'Princípios da Administração Pública (LIMPE)',
              'Atos Administrativos: conceitos, atributos e espécies',
              'Licitações e Contratos Administrativos (Lei 14.133/21)',
              'Agentes Públicos e Responsabilidade Civil do Estado',
            ],
          },
          {
            subject_name: 'Raciocínio Lógico & Matemática',
            topics: [
              'Lógica proposicional e tabelas-verdade',
              'Diagramas lógicos e equivalências',
              'Análise combinatória e probabilidade',
            ],
          },
        ],
      });
    }

    const ai = new GoogleGenAI({ apiKey });

    const systemPrompt = `Você é um especialista em análise de editais de concursos públicos e planejamento estratégico de estudos.
O usuário enviará o edital completo (em PDF ou texto) e os cargos pretendidos (${targetRoles}).
Sua missão é:
1. Extrair os metadados fundamentais do concurso (Banca, datas cruciais de inscrição/prova, remuneração inicial e etapas).
2. Mapear integralmente os requisitos do Teste de Aptidão Física (TAF) para os cargos indicados (se houver).
3. Montar a grade completa do Edital Verticalizado correspondente ao conteúdo programático dos cargos selecionados, agrupando por matérias e listando todos os tópicos individuais para marcação de estudo.
Retorne estritamente a saída formatada de acordo com o JSON Schema solicitado.`;

    const jsonStructurePrompt = `Forneça a resposta ESTRITAMENTE em formato JSON com a seguinte estrutura:
{
  "contest_title": "Polícia Federal - Agente Administrativo",
  "institution": "Cebraspe",
  "salary": "R$ 6.255,00",
  "target_date": "2026-11-29",
  "registration_deadline": "2026-10-15",
  "summary_points": [
    "Vagas: 150 imediatas + CR",
    "Fases: Prova Objetiva (120 itens Cebraspe C/E) + Redação discursiva",
    "Requisito: Nível Médio Completo"
  ],
  "taf_requirements": [
    {
      "modality": "Corrida de 12 minutos",
      "target_value": 2400.0,
      "unit": "metros"
    }
  ],
  "syllabus": [
    {
      "subject_name": "Língua Portuguesa",
      "topics": [
        "Compreensão e interpretação de textos",
        "Tipologia textual",
        "Ortografia oficial e acentuação gráfica"
      ]
    }
  ]
}`;

    const contents: any[] = [{ text: systemPrompt }];

    if (pdfBase64) {
      contents.push({
        inlineData: {
          mimeType: pdfMimeType,
          data: pdfBase64,
        },
      });
    }

    if (rawText) {
      contents.push({ text: `Texto bruto extraído do edital:\n${rawText}` });
    }

    contents.push({
      text: `Cargos selecionados pelo candidato: ${targetRoles}\n\n${jsonStructurePrompt}`,
    });

    const response = await generateContentWithRetry(ai, {
      model: PRIMARY_GEMINI_MODEL,
      contents,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const parsed = parseGeminiJson(response.text || '');
    const validated = parseEditalResponseSchema.parse(parsed);

    return NextResponse.json(validated);
  } catch (error: any) {
    console.error('Error in /api/gemini/parse-contest-doc:', error);
    return handleGeminiApiError(error, 'Falha ao analisar edital via Gemini IA');
  }
}
