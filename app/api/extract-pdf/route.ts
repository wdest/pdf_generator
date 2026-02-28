// app/api/extract-pdf/route.ts
import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('pdf') as File;

    if (!file) {
      return NextResponse.json({ error: 'Fayl tapılmadı' }, { status: 400 });
    }

    // PDF faylını Base64 formatına çeviririk
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64Pdf = buffer.toString('base64');

    // Açarları .env faylından götürüb array-ə çeviririk
    const keysString = process.env.GEMINI_API_KEYS || '';
    const apiKeys = keysString.split(',').map(k => k.trim()).filter(k => k.length > 0);

    if (apiKeys.length === 0) {
      return NextResponse.json({ error: 'API Key tapılmadı. .env.local faylını yoxlayın.' }, { status: 500 });
    }

    const prompt = `
      Sən olimpiada suallarını analiz edən köməkçisən. 
      Təqdim olunmuş PDF faylındakı bütün test suallarını və variantlarını çıxar.
      Sualların hansı dildə (en, az, ru) olduğunu müəyyən et.
      
      Mütləq və yalnız aşağıdakı JSON array formatında cavab qaytar (başqa heç nə yazma):
      [
        {
          "language": "az", 
          "text": "Sualın mətni burada ($$ riyazi ifadələr daxil $$)",
          "options": ["Variant 1", "Variant 2", "Variant 3", "Variant 4"]
        }
      ]
      Əgər sual daxilində riyazi ifadələr varsa, onları LaTeX formatında (məsələn $x^2$) saxla.
    `;

    let lastError: any = null;

    // API limitinə düşməmək üçün açarları bir-bir yoxlayırıq
    for (let i = 0; i < apiKeys.length; i++) {
      const currentKey = apiKeys[i];
      
      try {
        console.log(`PDF Extract: ${i + 1}-ci API açarı yoxlanılır...`);
        const ai = new GoogleGenAI({ apiKey: currentKey });

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [
                prompt,
                {
                    inlineData: {
                        data: base64Pdf,
                        mimeType: 'application/pdf'
                    }
                }
            ],
            config: {
                responseMimeType: "application/json"
            }
        });

        const resultText = response.text.trim();
        const parsedData = JSON.parse(resultText);

        return NextResponse.json({ questions: parsedData });

      } catch (error: any) {
        console.warn(`PDF Extract: ${i + 1}-ci açar xəta verdi:`, error.message || 'Bilinməyən xəta');
        lastError = error;
        continue; 
      }
    }

    console.error('PDF Extract: Bütün API açarları yoxlanıldı, lakin hamısı xəta verdi.');
    return NextResponse.json({ error: 'Bütün API açarlarının limiti dolub. Bir az sonra yenidən cəhd edin.' }, { status: 429 });

  } catch (error: any) {
    console.error('PDF Extract Ümumi API Error:', error);
    return NextResponse.json({ error: error.message || 'Sistem xətası' }, { status: 500 });
  }
}