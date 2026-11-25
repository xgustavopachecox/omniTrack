import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';
import {
  generateContentWithRetry,
  handleGeminiApiError,
  parseGeminiJson,
  PRIMARY_GEMINI_MODEL,
} from '@/lib/gemini';

const MAX_IMAGE_BYTES = 4.5 * 1024 * 1024; // 4.5 MB limite da Vercel Serverless

const detectedItemSchema = z.object({
  name: z.string(),
  estimated_grams: z.number(),
  calories: z.number(),
});

const nutritionPhotoResponseSchema = z.object({
  meal_name: z.string(),
  calories: z.number(),
  protein_g: z.number(),
  carbs_g: z.number(),
  fat_g: z.number(),
  items_detected: z.array(detectedItemSchema).optional().default([]),
  confidence_note: z
    .string()
    .optional()
    .default('Estimativa visual baseada em prato padrão (Tabela TACO/IBGE).'),
});

function sanitizePositiveNumber(val: unknown, fallback = 0): number {
  const num = Number(val);
  if (!Number.isFinite(num) || num < 0) return fallback;
  return Number(num.toFixed(1));
}

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || '';
    let imageBase64: string | null = null;
    let imageMimeType = 'image/jpeg';
    let notes = '';
    let mealType = 'Refeição';

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();

      const notesField = formData.get('notes');
      if (typeof notesField === 'string' && notesField.trim()) {
        notes = notesField.trim();
      }

      const mealTypeField = formData.get('meal_type');
      if (typeof mealTypeField === 'string' && mealTypeField.trim()) {
        mealType = mealTypeField.trim();
      }

      const imageFile = formData.get('image') || formData.get('photo') || formData.get('file');
      if (imageFile && imageFile instanceof Blob && imageFile.size > 0) {
        if (imageFile.size > MAX_IMAGE_BYTES) {
          return NextResponse.json(
            {
              error:
                'A imagem excede o limite de 4.5 MB. Por favor, selecione uma foto menor.',
            },
            { status: 413 }
          );
        }

        const fileName =
          'name' in imageFile && typeof (imageFile as File).name === 'string'
            ? (imageFile as File).name.toLowerCase()
            : '';
        const rawMime = (imageFile.type || '').toLowerCase();

        const isValidImage =
          rawMime.startsWith('image/') ||
          rawMime === 'application/octet-stream' ||
          /\.(jpg|jpeg|png|webp|heic|heif)$/i.test(fileName);

        if (!isValidImage) {
          return NextResponse.json(
            {
              error:
                'Arquivo inválido. Envie uma imagem nos formatos JPG, JPEG, PNG, WEBP ou HEIC.',
            },
            { status: 400 }
          );
        }

        if (rawMime.startsWith('image/')) {
          imageMimeType = rawMime;
        } else if (fileName.endsWith('.png')) {
          imageMimeType = 'image/png';
        } else if (fileName.endsWith('.webp')) {
          imageMimeType = 'image/webp';
        } else if (fileName.endsWith('.heic') || fileName.endsWith('.heif')) {
          imageMimeType = 'image/heic';
        } else {
          imageMimeType = 'image/jpeg';
        }

        const arrayBuffer = await imageFile.arrayBuffer();
        imageBase64 = Buffer.from(arrayBuffer).toString('base64');
      }
    } else {
      const body = await req.json().catch(() => ({}));
      if (body.notes) notes = String(body.notes).trim();
      if (body.meal_type) mealType = String(body.meal_type).trim();
      const rawImg = body.image || body.photoBase64;
      if (typeof rawImg === 'string' && rawImg.trim()) {
        if (rawImg.startsWith('data:')) {
          const parts = rawImg.split(';base64,');
          imageMimeType = parts[0].replace('data:', '') || 'image/jpeg';
          imageBase64 = parts[1] || null;
        } else {
          imageBase64 = rawImg.trim();
        }
      }
    }

    if (!imageBase64) {
      return NextResponse.json(
        { error: 'Nenhuma foto da refeição foi recebida para análise.' },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey || apiKey === 'your_google_ai_studio_gemini_api_key') {
      return NextResponse.json({
        meal_name: notes
          ? `Prato Analisado (${notes.slice(0, 40)})`
          : 'Arroz, feijão, peito de frango grelhado e salada',
        meal_type: mealType,
        calories: 580,
        protein_g: 46,
        carbs_g: 62,
        fat_g: 14,
        fats_g: 14,
        items_detected: [
          {
            name: 'Peito de frango grelhado',
            estimated_grams: 150,
            calories: 248,
          },
          {
            name: 'Arroz branco cozido',
            estimated_grams: 140,
            calories: 180,
          },
          {
            name: 'Feijão carioca cozido',
            estimated_grams: 100,
            calories: 76,
          },
          {
            name: 'Salada com fio de azeite',
            estimated_grams: 80,
            calories: 76,
          },
        ],
        confidence_note:
          'Estimativa baseada em prato padrão (Tabela TACO/IBGE). Configure GEMINI_API_KEY para visão computacional em tempo real.',
      });
    }

    const ai = new GoogleGenAI({ apiKey });

    const systemPrompt = `Você é um nutricionista esportivo sênior altamente experiente em alimentos brasileiros e na Tabela TACO / IBGE.
Sua tarefa é analisar a foto da refeição enviada pelo usuário (${mealType}).
Instruções técnicas:
1. Identifique visualmente cada alimento visível no prato ou embalagem.
2. Estime as porções em gramas (g) usando o diâmetro do prato, talheres ou copo como referência espacial realista.
3. Considere prioritariamente as observações extras fornecidas pelo usuário (ex: pesos informados, uso de azeite, manteiga, whey, etc.): "${notes || 'Nenhuma observação extra informada'}".
4. Calcule o total de calorias (kcal), proteínas (protein_g), carboidratos (carbs_g) e gorduras (fat_g) somando os itens identificados com base na tabela TACO/IBGE.
5. Retorne estritamente um objeto JSON válido seguindo o schema.`;

    const contents = [
      { text: systemPrompt },
      {
        inlineData: {
          mimeType: imageMimeType,
          data: imageBase64,
        },
      },
      {
        text: `Tipo de refeição: ${mealType}. Observações do usuário: ${
          notes || 'Sem observações adicionais.'
        }. Retorne o JSON estrito com meal_name, calories, protein_g, carbs_g, fat_g, items_detected e confidence_note.`,
      },
    ];

    const response = await generateContentWithRetry(ai, {
      model: PRIMARY_GEMINI_MODEL,
      contents,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            meal_name: { type: 'STRING' },
            calories: { type: 'NUMBER' },
            protein_g: { type: 'NUMBER' },
            carbs_g: { type: 'NUMBER' },
            fat_g: { type: 'NUMBER' },
            items_detected: {
              type: 'ARRAY',
              items: {
                type: 'OBJECT',
                properties: {
                  name: { type: 'STRING' },
                  estimated_grams: { type: 'NUMBER' },
                  calories: { type: 'NUMBER' },
                },
                required: ['name', 'estimated_grams', 'calories'],
              },
            },
            confidence_note: { type: 'STRING' },
          },
          required: [
            'meal_name',
            'calories',
            'protein_g',
            'carbs_g',
            'fat_g',
            'items_detected',
            'confidence_note',
          ],
        },
      },
    });

    const rawParsed = parseGeminiJson(response.text || '');

    // Sanitização numérica estrita para garantir que nunca retorne NaN ou valores negativos
    const sanitizedPayload = {
      meal_name:
        typeof rawParsed?.meal_name === 'string' && rawParsed.meal_name.trim()
          ? rawParsed.meal_name.trim()
          : `Refeição (${mealType})`,
      calories: Math.round(sanitizePositiveNumber(rawParsed?.calories, 0)),
      protein_g: sanitizePositiveNumber(rawParsed?.protein_g, 0),
      carbs_g: sanitizePositiveNumber(rawParsed?.carbs_g, 0),
      fat_g: sanitizePositiveNumber(
        rawParsed?.fat_g ?? rawParsed?.fats_g,
        0
      ),
      items_detected: Array.isArray(rawParsed?.items_detected)
        ? rawParsed.items_detected.map((item: any) => ({
            name: String(item?.name || 'Alimento identificado').trim(),
            estimated_grams: Math.round(
              sanitizePositiveNumber(item?.estimated_grams, 100)
            ),
            calories: Math.round(sanitizePositiveNumber(item?.calories, 0)),
          }))
        : [],
      confidence_note:
        typeof rawParsed?.confidence_note === 'string' &&
        rawParsed.confidence_note.trim()
          ? rawParsed.confidence_note.trim()
          : 'Estimativa baseada em prato padrão (Tabela TACO/IBGE).',
    };

    const validated = nutritionPhotoResponseSchema.parse(sanitizedPayload);

    return NextResponse.json({
      ...validated,
      meal_type: mealType,
      fats_g: validated.fat_g,
    });
  } catch (error: any) {
    console.error('Error in /api/gemini/nutrition-photo:', error);
    return handleGeminiApiError(
      error,
      'Falha ao analisar a foto da refeição via Gemini IA.'
    );
  }
}
