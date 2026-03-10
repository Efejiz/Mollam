const { GoogleGenerativeAI } = require('@google/generative-ai');

const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
    console.error('❌ GEMINI_API_KEY ortam değişkeni tanımlı değil! .env dosyasını kontrol edin.');
    process.exit(1);
}
const genAI = new GoogleGenerativeAI(API_KEY);

const SYSTEM_PROMPT = `Sen "Mollam" adlı İslami bir fıkıh asistanısın. Görevlerin:

1. SADECE İslami fıkıh, ibadet, ahlak ve İslami ilimler hakkında soruları cevapla.
2. Cevaplarını KESİNLİKLE Ehl-i Sünnet vel Cemaat akidesine ve muteber İslami kaynaklara (Tam İlmihal Seadet-i Ebediyye, Mektubat-ı Rabbani, İhya-u Ulumiddin, Riyazü's-Salihin, Kütüb-i Sitte, Dürr-ül Muhtar, İbni Abidin vb.) dayandır.
3. Her cevapta hangi kaynaktan (kitap ismi ve mümkünse yazar/bölüm) yararlandığını açıkça belirt.
4. İtikadi sapmalara kesinlikle izin verme. Ehl-i Sünnet dışı görüşleri (Vehhabiyye, Şia vb. sapkın görüşleri) doğruymuş gibi yansıtma.
5. Cevaplarını Türkçe ver.
6. Sorulan mezhep filtresine göre (Hanefi, Şafii, Maliki, Hanbeli) spesifik cevap ver. Eğer belirtilmemişse varsayılan olarak Hanefi mezhebini baz al.
7. İslami konular dışında soru gelirse, kibarca "Ben sadece İslami ilimler konusunda yardımcı olabilirim" de.
8. Her cevabın sonunda, kullandığın kaynakların isimlerini JSON formatında ver: {"sources": ["kaynak1", "kaynak2"]}
9. Saygılı ve öğretici bir dil kullan.

ÖNEMLİ KURALLAR:
- ASLA PDF veya harici bir metin (RAG) olmadan uydurma kaynak verme. Kendi eğitim verilerindeki en doğru Ehl-i Sünnet kaynaklarını kullan.
- Emin olmadığın veya ihtilaflı konularda "Bu konuda bir ehli sünnet alimine veya muteber ilmihallere danışmanızı tavsiye ederim" de.`;

/**
 * Classify Gemini API errors for better user feedback
 */
function classifyError(error) {
    const msg = (error.message || '').toLowerCase();
    const status = error.status || error.httpStatusCode || 0;

    if (status === 429 || msg.includes('rate limit') || msg.includes('quota')) {
        return { type: 'RATE_LIMIT', userMsg: 'Çok fazla istek gönderildi. Lütfen birkaç saniye bekleyip tekrar deneyin.' };
    }
    if (status === 401 || status === 403 || msg.includes('api key') || msg.includes('permission')) {
        return { type: 'AUTH', userMsg: 'API bağlantı hatası. Lütfen yöneticiye bildirin.' };
    }
    if (msg.includes('safety') || msg.includes('blocked')) {
        return { type: 'SAFETY', userMsg: 'Bu soru güvenlik filtresine takıldı. Lütfen sorunuzu farklı şekilde sorun.' };
    }
    if (msg.includes('network') || msg.includes('fetch') || msg.includes('econnrefused')) {
        return { type: 'NETWORK', userMsg: 'Sunucu bağlantısı kurulamadı. İnternet bağlantınızı kontrol edin.' };
    }
    return { type: 'UNKNOWN', userMsg: 'Üzgünüm, şu anda bir hata oluştu. Lütfen tekrar deneyin.' };
}

// ── AI CACHE SYSTEM ──────────────────────────────────────────
const aiCache = new Map();
const CACHE_LIMIT = 500;

function getCacheKey(msg, madhab, cat) {
    return `${msg.trim().toLowerCase()}_${madhab || 'Hanefi'}_${cat || ''}`;
}

/**
 * Generate a response using Gemini API (with retry + model fallback)
 */
const MODELS = ['gemini-2.5-flash', 'gemma-3-12b-it'];

async function generateResponse(userMessage, madhab = 'Hanefi', category = '', history = []) {
    const cacheKey = getCacheKey(userMessage, madhab, category);
    if ((!history || history.length === 0) && aiCache.has(cacheKey)) {
        console.log(`⚡ Serving from AI Cache: ${cacheKey}`);
        const cached = aiCache.get(cacheKey);
        return { success: true, text: cached.text, sources: cached.sources };
    }

    const MAX_RETRIES = 2;

    for (const modelName of MODELS) {
        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            try {
                console.log(`🤖 Trying model: ${modelName} (attempt ${attempt}/${MAX_RETRIES})`);
                const model = genAI.getGenerativeModel({ model: modelName });

                let prompt = SYSTEM_PROMPT + '\n\n';

                if (madhab) {
                    prompt += `Kullanıcının seçtiği mezhep: ${madhab}\n`;
                }
                if (category) {
                    prompt += `Soru kategorisi: ${category}\n`;
                }

                // Add conversation history for context
                if (history.length > 0) {
                    prompt += `\n--- ÖNCEKİ KONUŞMA ---\n`;
                    history.slice(-6).forEach(h => {
                        prompt += `Kullanıcı: ${h.role === 'user' ? h.text : ''}\n`;
                        prompt += `Mollam: ${h.role === 'ai' ? h.text : ''}\n`;
                    });
                    prompt += `--- ÖNCEKİ KONUŞMA SONU ---\n\n`;
                    prompt += `Mevcut Konuşmada devam ediyorsunuz. Tekrar Selam VERME.\n\n`;
                } else {
                    prompt += `Bu yeni bir sohbet. Lütfen cevabına "Esselamu Aleyküm." diyerek başla.\n\n`;
                }

                prompt += `Kullanıcı sorusu: ${userMessage}`;

                const result = await model.generateContent(prompt);
                const response = await result.response;
                const text = response.text();

                // Try to extract source JSON from response
                let sources = [];
                const sourceMatch = text.match(/\{"sources":\s*\[([^\]]+)\]\}/);
                if (sourceMatch) {
                    try {
                        const parsed = JSON.parse(sourceMatch[0]);
                        sources = parsed.sources;
                    } catch (e) {
                        // fallback — regex matched but JSON was malformed
                    }
                }

                // Clean the response text (remove source JSON from displayed text)
                const cleanText = text.replace(/\{"sources":\s*\[[^\]]*\]\}/g, '').trim();
                const finalSources = sources.length > 0 ? sources : ['Genel İslami Bilgi'];

                if (!history || history.length === 0) {
                    if (aiCache.size >= CACHE_LIMIT) aiCache.delete(aiCache.keys().next().value);
                    aiCache.set(cacheKey, { text: cleanText, sources: finalSources });
                }

                return {
                    success: true,
                    text: cleanText,
                    sources: finalSources
                };
            } catch (error) {
                const classified = classifyError(error);
                console.error(`Gemini API error [${classified.type}] (attempt ${attempt}/${MAX_RETRIES}):`, error.message);

                // Retry on rate limit or network errors
                if ((classified.type === 'RATE_LIMIT' || classified.type === 'NETWORK') && attempt < MAX_RETRIES) {
                    const waitMs = Math.pow(2, attempt) * 1000;
                    console.log(`⏳ Waiting ${waitMs}ms before retry...`);
                    await new Promise(r => setTimeout(r, waitMs));
                    continue;
                }

                // If not rate limit/network, or last attempt of this model — try next model
                if (classified.type === 'RATE_LIMIT' || classified.type === 'NETWORK') {
                    console.log(`🔄 Model ${modelName} quota exhausted, trying next model...`);
                    break; // break inner retry loop, try next model
                }

                return {
                    success: false,
                    text: classified.userMsg,
                    sources: [],
                    errorType: classified.type,
                    error: error.message
                };
            }
        }
    }

    // All models and retries exhausted
    return {
        success: false,
        text: 'Tüm AI modelleri şu anda meşgul. Lütfen birkaç dakika sonra tekrar deneyin.',
        sources: [],
        errorType: 'RATE_LIMIT',
        error: 'All models quota exhausted'
    };
}

/**
 * Generate a streaming response using Gemini API (with retry + model fallback)
 */
async function generateResponseStream(userMessage, madhab = 'Hanefi', category = '', history = [], res) {
    const cacheKey = getCacheKey(userMessage, madhab, category);
    if ((!history || history.length === 0) && aiCache.has(cacheKey)) {
        console.log(`⚡ Serving from AI Cache (Stream): ${cacheKey}`);
        const cached = aiCache.get(cacheKey);

        // Simulate streaming (fast stream)
        const words = cached.text.split(' ');
        for (const w of words) {
            res.write(`data: ${JSON.stringify({ type: 'chunk', text: w + ' ' })}\n\n`);
            await new Promise(r => setTimeout(r, 20)); // ultra-fast streaming
        }
        res.write(`data: ${JSON.stringify({ type: 'done', sources: cached.sources })}\n\n`);
        res.end();
        return { success: true };
    }

    const MAX_RETRIES = 2;

    for (const modelName of MODELS) {
        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            try {
                console.log(`🤖 Trying model: ${modelName} STREAM (attempt ${attempt}/${MAX_RETRIES})`);
                const model = genAI.getGenerativeModel({ model: modelName });

                let prompt = SYSTEM_PROMPT + '\n\n';

                if (madhab) prompt += `Kullanıcının seçtiği mezhep: ${madhab}\n`;
                if (category) prompt += `Soru kategorisi: ${category}\n`;

                if (history.length > 0) {
                    prompt += `\n--- ÖNCEKİ KONUŞMA ---\n`;
                    history.slice(-6).forEach(h => {
                        prompt += `Kullanıcı: ${h.role === 'user' ? h.text : ''}\n`;
                        prompt += `Mollam: ${h.role === 'ai' ? h.text : ''}\n`;
                    });
                    prompt += `--- ÖNCEKİ KONUŞMA SONU ---\n\n`;
                    prompt += `Mevcut Konuşmada devam ediyorsunuz. Tekrar Selam VERME.\n\n`;
                } else {
                    prompt += `Bu yeni bir sohbet. Lütfen cevabına "Esselamu Aleyküm." diyerek başla.\n\n`;
                }

                prompt += `Kullanıcı sorusu: ${userMessage}`;

                const result = await model.generateContentStream(prompt);
                let fullText = "";

                for await (const chunk of result.stream) {
                    const chunkText = chunk.text();
                    fullText += chunkText;

                    res.write(`data: ${JSON.stringify({ type: 'chunk', text: chunkText })}\n\n`);
                }

                let sources = [];
                const sourceMatch = fullText.match(/\{"sources":\s*\[([^\]]+)\]\}/);
                if (sourceMatch) {
                    try {
                        const parsed = JSON.parse(sourceMatch[0]);
                        sources = parsed.sources;
                    } catch (e) { }
                }

                const cleanText = fullText.replace(/\{"sources":\s*\[[^\]]*\]\}/g, '').trim();
                const finalSources = sources.length > 0 ? sources : ['Genel İslami Bilgi'];

                if (!history || history.length === 0) {
                    if (aiCache.size >= CACHE_LIMIT) aiCache.delete(aiCache.keys().next().value);
                    aiCache.set(cacheKey, { text: cleanText, sources: finalSources });
                }

                res.write(`data: ${JSON.stringify({ type: 'done', sources: finalSources })}\n\n`);
                res.end();
                return { success: true };

            } catch (error) {
                const classified = classifyError(error);
                console.error(`Gemini API stream error [${classified.type}] (attempt ${attempt}/${MAX_RETRIES}):`, error.message);

                if ((classified.type === 'RATE_LIMIT' || classified.type === 'NETWORK') && attempt < MAX_RETRIES) {
                    const waitMs = Math.pow(2, attempt) * 1000;
                    console.log(`⏳ Waiting ${waitMs}ms before retry...`);
                    await new Promise(r => setTimeout(r, waitMs));
                    continue;
                }

                if (classified.type === 'RATE_LIMIT' || classified.type === 'NETWORK') {
                    console.log(`🔄 Model ${modelName} quota exhausted, trying next model...`);
                    break;
                }

                res.write(`data: ${JSON.stringify({ type: 'error', text: classified.userMsg })}\n\n`);
                res.end();
                return { success: false };
            }
        }
    }

    res.write(`data: ${JSON.stringify({ type: 'error', text: 'Tüm AI modelleri şu anda meşgul. Lütfen birkaç dakika sonra tekrar deneyin.' })}\n\n`);
    res.end();
    return { success: false };
}

module.exports = { generateResponse, generateResponseStream };
