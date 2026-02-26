import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export async function POST(req: Request) {
  try {
    const { items } = await req.json();
    
    const keysString = process.env.GEMINI_API_KEYS || '';
    const apiKeys = keysString.split(',').map(k => k.trim()).filter(k => k.length > 0);

    if (apiKeys.length === 0) {
      return NextResponse.json({ error: 'API Key tapılmadı. .env.local faylını yoxlayın.' }, { status: 500 });
    }

    // AI-yə yeni, daha dinamik təlimat veririk
    const prompt = `
      Sən riyaziyyat və məntiq olimpiadası ekspertisən. Aşağıdakı JSON array-də suallar və onların variantları verilib.
      Hər bir sual obyektində 'en', 'az' və 'ru' dilləri mövcuddur. 
      
      SƏNİN VƏZİFƏN:
      Təqdim olunmuş məlumatda hansı dil(lər)in mətni və variantları DOLUDURSA, onu əsas (referans) kimi qəbul et. 
      Həmin referans dildən istifadə edərək digər BOŞ (və ya eksik) olan dilləri tərcümə et və tamamla.
      
      ŞƏRTLƏR:
      1. Elmi və riyazi terminologiyanı (integer, prime number, subset və s.) tam qoru.
      2. Dəyişənləri və tənlikləri olduğu kimi saxla.
      3. Cavab olaraq YALNIZ VƏ YALNIZ aşağıdakı formatda, bütün 3 dilin də (en, az, ru) tam doldurulduğu JSON array qaytar.

      GÖZLƏNİLƏN JSON FORMATI:
      [
        {
          "en": { "text": "İngiliscə şərt", "options": ["A", "B", "C", "D"] },
          "az": { "text": "Azərbaycanca şərt", "options": ["A", "B", "C", "D"] },
          "ru": { "text": "Rusca şərt", "options": ["A", "B", "C", "D"] }
        }
      ]
      
      TƏRCÜMƏ EDİLƏCƏK (və bəzi hissələri boş olan) MƏLUMAT: ${JSON.stringify(items)}
    `;

    let lastError: any = null;

    for (let i = 0; i < apiKeys.length; i++) {
      const currentKey = apiKeys[i];
      
      try {
        console.log(`${i + 1}-ci API açarı yoxlanılır...`);
        const ai = new GoogleGenAI({ apiKey: currentKey });

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: {
                responseMimeType: "application/json"
            }
        });

        const resultText = response.text.trim();
        const parsedData = JSON.parse(resultText);

        return NextResponse.json(parsedData);

      } catch (error: any) {
        console.warn(`${i + 1}-ci açar xəta verdi:`, error.message || 'Bilinməyən xəta');
        lastError = error;
        continue; 
      }
    }

    console.error('Bütün API açarları yoxlanıldı, lakin hamısı xəta verdi.');
    return NextResponse.json({ error: 'Bütün API açarlarının limiti dolub. Bir az sonra yenidən cəhd edin.' }, { status: 429 });

  } catch (error: any) {
    console.error('Ümumi API Error:', error);
    return NextResponse.json({ error: error.message || 'Sistem xətası' }, { status: 500 });
  }
}