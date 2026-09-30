import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';

const explainErrorSchema = z.object({
  ai_clarification: z.string(),
  suggested_error_reason: z.string().optional(),
  key_legal_point: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const questionStatement = body.questionStatement || '';
    const userAnswer = body.userAnswer || '';
    const correctAnswer = body.correctAnswer || '';
    const subjectName = body.subjectName || 'Concurso Público';
    const topicName = body.topicName || '';

    if (!questionStatement) {
      return NextResponse.json(
        { error: 'É necessário fornecer o enunciado da questão.' },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey || apiKey === 'your_google_ai_studio_gemini_api_key') {
      return NextResponse.json({
        ai_clarification: `Explicação Técnica IA: No tema "${topicName || subjectName}", a resposta escolhida (${userAnswer}) incorre no erro clássico de interpretação da norma. O gabarito correto é "${correctAnswer}". Lembre-se de verificar sempre a exceção expressa na regra geral da lei ou dispositivo constitucional pertinente.`,
        suggested_error_reason: 'Pegadinha da Banca',
        key_legal_point: 'Atenção aos requisitos temporais e exceções expressas na lei seca.',
      });
    }

    const ai = new GoogleGenAI({ apiKey });

    const prompt = `Você é um professor titular e especialista em bancas de concursos públicos.
Analise a questão e o erro cometido pelo candidato e forneça uma "Explicação Mastigada" extremamente didática, objetiva e memorável.

Dados da Questão:
- Matéria: ${subjectName}
- Tópico: ${topicName}
- Enunciado: "${questionStatement}"
- Resposta marcada pelo candidato (ERRADA): "${userAnswer}"
- Gabarito Oficial (CORRETO): "${correctAnswer}"

Instruções:
1. Explique em linguagem simples e direta por que a resposta do candidato está incorreta e por que o gabarito oficial é o correto.
2. Identifique qual foi a "Pegadinha" ou motivo provável do erro (ex: 'Pegadinha da Banca', 'Falta de Atenção', 'Não sabia a Lei Seca', 'Interpretação de Texto').
3. Destaque um Ponto de Ouro (Key Legal Point / Dispositivo Legal) para nunca mais errar em prova.

Formate a resposta em JSON respeitando o schema.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            ai_clarification: { type: 'STRING' },
            suggested_error_reason: { type: 'STRING' },
            key_legal_point: { type: 'STRING' },
          },
          required: ['ai_clarification'],
        },
      },
    });

    const responseText = response.text || '';
    const parsedJson = JSON.parse(responseText);
    const validatedData = explainErrorSchema.parse(parsedJson);

    return NextResponse.json(validatedData);
  } catch (error: any) {
    console.error('Error generating AI error clarification:', error);
    return NextResponse.json(
      { error: 'Falha ao gerar explicação da IA.', details: error?.message },
      { status: 500 }
    );
  }
}
