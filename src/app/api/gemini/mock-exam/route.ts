import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';

const mockExamQuestionSchema = z.object({
  subject_name: z.string(),
  topic_name: z.string(),
  question_statement: z.string(),
  question_type: z.enum(['multiple_choice', 'true_false']),
  options: z.array(z.object({ key: z.string(), text: z.string() })).optional(),
  correct_answer: z.string(),
  explanation: z.string(),
});

const mockExamResponseSchema = z.object({
  title: z.string(),
  scoring_system: z.enum(['standard', 'cebraspe_penalty']),
  questions: z.array(mockExamQuestionSchema),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const contestTitle = body.contestTitle || 'Concurso Público';
    const institution = body.institution || 'Cebraspe';
    const numQuestions = body.numQuestions || 5;
    const questionType = body.questionType || (institution.toLowerCase().includes('cebraspe') ? 'true_false' : 'multiple_choice');
    const subjects = body.subjects || ['Direito Constitucional', 'Direito Administrativo', 'Língua Portuguesa'];

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey || apiKey === 'your_google_ai_studio_gemini_api_key') {
      // Smart Heuristic Fallback when GEMINI_API_KEY is not set
      const isCebraspe = questionType === 'true_false';
      return NextResponse.json({
        title: `Simulado IA Inédito - ${contestTitle} (${institution})`,
        scoring_system: isCebraspe ? 'cebraspe_penalty' : 'standard',
        questions: [
          {
            subject_name: 'Direito Constitucional',
            topic_name: 'Direitos e Garantias Fundamentais (Art. 5º)',
            question_statement: 'A casa é asilo inviolável do indivíduo, ninguém nela podendo penetrar sem consentimento do morador, salvo em caso de flagrante delito ou desastre, ou para prestar socorro, ou, durante a noite, por determinação judicial.',
            question_type: isCebraspe ? 'true_false' : 'multiple_choice',
            options: isCebraspe
              ? [{ key: 'CERTO', text: 'Certo' }, { key: 'ERRADO', text: 'Errado' }]
              : [
                  { key: 'A', text: 'Apenas durante o dia em caso de ordem judicial.' },
                  { key: 'B', text: 'Em qualquer horário por determinação judicial.' },
                  { key: 'C', text: 'Apenas com autorização do proprietário.' },
                  { key: 'D', text: 'Apenas durante a noite.' },
                ],
            correct_answer: isCebraspe ? 'ERRADO' : 'A',
            explanation: 'Conforme art. 5º, XI da CF/88, por determinação judicial o ingresso domiciliar SÓ é permitido DURANTE O DIA.',
          },
          {
            subject_name: 'Direito Administrativo',
            topic_name: 'Atos Administrativos: conceitos e atributos',
            question_statement: 'O ato administrativo eivado de vício de legalidade deve ser anulado pela própria Administração Pública, em homenagem ao princípio da autotutela.',
            question_type: isCebraspe ? 'true_false' : 'multiple_choice',
            options: isCebraspe
              ? [{ key: 'CERTO', text: 'Certo' }, { key: 'ERRADO', text: 'Errado' }]
              : [
                  { key: 'A', text: 'Revogado por conveniência.' },
                  { key: 'B', text: 'Anulado por ilegalidade.' },
                  { key: 'C', text: 'Convalidado obrigatoriamente.' },
                  { key: 'D', text: 'Mantido se houver boa-fé.' },
                ],
            correct_answer: isCebraspe ? 'CERTO' : 'B',
            explanation: 'Súmula 473 do STF: a administração pode anular seus próprios atos, quando eivados de vícios que os tornam ilegais.',
          },
          {
            subject_name: 'Língua Portuguesa',
            topic_name: 'Sintaxe e Regência',
            question_statement: 'Assinale a opção em que a regência do verbo e o emprego da crase obedecem à norma culta.',
            question_type: 'true_false',
            options: [{ key: 'CERTO', text: 'Certo' }, { key: 'ERRADO', text: 'Errado' }],
            correct_answer: 'CERTO',
            explanation: 'O verbo obedecer exige preposição "a", formando crase diante do artigo feminino "a".',
          },
        ].slice(0, numQuestions),
      });
    }

    const ai = new GoogleGenAI({ apiKey });

    const prompt = `Você é um elaborador sênior de provas de concursos públicos brasileiros especialista na banca ${institution}.
Gere um simulado inédito para o concurso "${contestTitle}".
Exigências:
- Quantidade de questões: ${numQuestions}
- Tipo de questão: ${questionType === 'true_false' ? 'Certo ou Errado (Cebraspe)' : 'Múltipla Escolha (4 opções: A, B, C, D)'}
- Matérias a contemplar: ${subjects.join(', ')}
- Nível de dificuldade elevado, com pegadinhas clássicas da banca ${institution} e fundamentação técnica em jurisprudência (STF/STJ) e lei seca.

Formate a resposta rigorosamente em JSON respeitando o schema fornecido.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            title: { type: 'STRING' },
            scoring_system: { type: 'STRING', enum: ['standard', 'cebraspe_penalty'] },
            questions: {
              type: 'ARRAY',
              items: {
                type: 'OBJECT',
                properties: {
                  subject_name: { type: 'STRING' },
                  topic_name: { type: 'STRING' },
                  question_statement: { type: 'STRING' },
                  question_type: { type: 'STRING', enum: ['multiple_choice', 'true_false'] },
                  options: {
                    type: 'ARRAY',
                    items: {
                      type: 'OBJECT',
                      properties: {
                        key: { type: 'STRING' },
                        text: { type: 'STRING' },
                      },
                      required: ['key', 'text'],
                    },
                  },
                  correct_answer: { type: 'STRING' },
                  explanation: { type: 'STRING' },
                },
                required: ['subject_name', 'topic_name', 'question_statement', 'question_type', 'correct_answer', 'explanation'],
              },
            },
          },
          required: ['title', 'scoring_system', 'questions'],
        },
      },
    });

    const responseText = response.text || '';
    const parsedJson = JSON.parse(responseText);
    const validatedData = mockExamResponseSchema.parse(parsedJson);

    return NextResponse.json(validatedData);
  } catch (error: any) {
    console.error('Error generating mock exam with Gemini:', error);
    return NextResponse.json(
      { error: 'Falha ao gerar simulado com IA.', details: error?.message },
      { status: 500 }
    );
  }
}
