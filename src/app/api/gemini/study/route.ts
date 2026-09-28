import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';

const studyResponseSchema = z.object({
  mode: z.enum(['doubt', 'mnemonic', 'question']),
  title: z.string(),
  explanation: z.string(),
  mnemonic: z.string().optional(),
  question: z
    .object({
      statement: z.string(),
      options: z.array(z.string()),
      correctIndex: z.number(),
      explanation: z.string(),
    })
    .optional(),
  keyTakeaways: z.array(z.string()),
});

export async function POST(req: NextRequest) {
  try {
    let textInput: string | null = null;
    let mode: 'doubt' | 'mnemonic' | 'question' = 'doubt';
    let topicName: string = 'Concurso Público';
    let audioBuffer: Buffer | null = null;
    let audioMimeType = 'audio/webm';

    const contentType = req.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const text = formData.get('text');
      if (typeof text === 'string') textInput = text;
      
      const reqMode = formData.get('mode');
      if (reqMode && typeof reqMode === 'string' && ['doubt', 'mnemonic', 'question'].includes(reqMode)) {
        mode = reqMode as any;
      }

      const reqTopic = formData.get('topic');
      if (reqTopic && typeof reqTopic === 'string') topicName = reqTopic;

      const audioFile = formData.get('audio');
      if (audioFile && audioFile instanceof Blob) {
        audioMimeType = audioFile.type || 'audio/webm';
        const arrayBuffer = await audioFile.arrayBuffer();
        audioBuffer = Buffer.from(arrayBuffer);
      }
    } else {
      const body = await req.json().catch(() => ({}));
      if (body.text) textInput = body.text;
      if (body.mode && ['doubt', 'mnemonic', 'question'].includes(body.mode)) mode = body.mode;
      if (body.topic) topicName = body.topic;
    }

    if (!textInput && !audioBuffer) {
      return NextResponse.json(
        { error: 'É necessário fornecer um texto ou arquivo de áudio.' },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey || apiKey === 'your_google_ai_studio_gemini_api_key') {
      // Smart Heuristic Fallback when GEMINI_API_KEY is not set
      const sampleQuery = textInput || 'Pergunta sobre Direito/Informática';

      if (mode === 'mnemonic') {
        return NextResponse.json({
          mode: 'mnemonic',
          title: `Mnemônico de Fixação: ${topicName}`,
          explanation: `Para memorizar rapidamente os conceitos fundamentais de ${topicName}, utilize o acrônimo clássico da banca:`,
          mnemonic: 'LIMPE -> Legalidade, Impessoalidade, Moralidade, Publicidade, Eficiência (Art. 37 da CF/88)',
          keyTakeaways: [
            'Princípios expressos aplicáveis a todos os poderes',
            'Eficiência foi incluída pela EC nº 19/1998',
            'Não confunda com princípios implícitos como Proporcionalidade e Razoabilidade'
          ],
        });
      }

      if (mode === 'question') {
        return NextResponse.json({
          mode: 'question',
          title: `Simulado Inédito: ${topicName}`,
          explanation: `Questão no formato clássico de múltipla escolha com foco em pegadinhas comuns da banca examinadora.`,
          question: {
            statement: `Em relação ao tema ${topicName}, assinale a alternativa CORRETA com base no ordenamento jurídico vigente:`,
            options: [
              'A) O princípio da legalidade administrativa permite ao agente público fazer tudo o que a lei não proíbe.',
              'B) O ato administrativo viciado por vício de competência é nulo de pleno direito e jamais admite convalidação.',
              'C) A administração pública pode anular seus próprios atos quando eivados de vícios de legalidade (Súmula 473 do STF).',
              'D) O poder hierárquico autoriza a delegação de competência para edição de atos de caráter normativo.',
            ],
            correctIndex: 2,
            explanation: 'Gabarito C. Conforme a Súmula 473/STF e o art. 53 da Lei 9.784/99, a Administração pode anular seus próprios atos quando eivados de vício de legalidade, ou revogá-los por conveniência e oportunidade.',
          },
          keyTakeaways: [
            'Súmula 473 do STF despenca em provas de concursos federais',
            'Anulação opera efeitos ex tunc; revogação opera efeitos ex nunc',
            'Atos normativos, decisão de recursos e matérias exclusivas NÃO podem ser delegados (NOREDE)'
          ],
        });
      }

      // Default: doubt
      return NextResponse.json({
        mode: 'doubt',
        title: `Esclarecimento sobre ${topicName}`,
        explanation: `Sua dúvida sobre "${sampleQuery}" envolve um tópico recorrente em concursos de alto nível.\n\nPrincipais pontos a observar:\n1. Requisitos de validade e jurisprudência dos tribunais superiores (STF e STJ).\n2. Exceções e pegadinhas de prova cobradas por bancas como Cebraspe e FGV.`,
        keyTakeaways: [
          'Leia a letra seca da lei e atente-se para palavras como "sempre", "vedado" e "exclusivamente"',
          'Revise o mapa mental em até 24 horas para consolidar a curva do esquecimento',
          'Resolva pelo menos 10 questões desse tópico no banco de questões'
        ],
      });
    }

    const ai = new GoogleGenAI({ apiKey });

    const systemPrompt = `Você é um Mentor Especialista em Concursos Públicos (Polícia Federal, Receita Federal, Tribunais e Carreiras Fiscais). 
Analise a solicitação do candidato para o tópico "${topicName}" e forneça uma resposta didática, direta e focada em aprovação no formato JSON exigido.`;

    const contents: any[] = [];
    contents.push({ text: systemPrompt });

    if (audioBuffer) {
      const base64Audio = audioBuffer.toString('base64');
      contents.push({
        inlineData: {
          mimeType: audioMimeType,
          data: base64Audio,
        },
      });
    }

    if (textInput) {
      contents.push({ text: `Modo Requisitado: ${mode}\nTópico: ${topicName}\nSolicitação do Candidato: ${textInput}` });
    }

    contents.push({
      text: `Devolva ESTRITAMENTE um JSON estruturado com o seguinte schema:
{
  "mode": "${mode}",
  "title": "Título do Resumo ou Questão",
  "explanation": "Explicação completa e didática",
  "mnemonic": "Palavra mnemônica ou dica rápida de memorização (opcional)",
  "question": {
    "statement": "Enunciado da questão simulada inédita (apenas se mode=question)",
    "options": ["A) Opção 1", "B) Opção 2", "C) Opção 3", "D) Opção 4"],
    "correctIndex": 2,
    "explanation": "Explicação detalhada do gabarito"
  },
  "keyTakeaways": ["Ponto-chave 1 para decorar", "Ponto-chave 2 para a prova"]
}`,
    });

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const responseText = response.text || '';
    const cleanedJsonStr = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleanedJsonStr);
    const validated = studyResponseSchema.parse(parsed);

    return NextResponse.json(validated);
  } catch (error: any) {
    console.error('Error in /api/gemini/study:', error);
    return NextResponse.json(
      { error: 'Falha ao processar auxílio de estudos via Gemini', details: error.message },
      { status: 500 }
    );
  }
}
