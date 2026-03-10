require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const morgan = require('morgan');
const connectDB = require('./config/db');
const { generateResponse, generateResponseStream } = require('./gemini');

// ── App Version ─────────────────────────────────────────
const APP_VERSION = '2.5.0';

// Connect to MongoDB
connectDB();

// ── Simple Logger ───────────────────────────────────────
function log(level, msg, meta = {}) {
    const ts = new Date().toISOString();
    const metaStr = Object.keys(meta).length > 0 ? ' ' + JSON.stringify(meta) : '';
    console.log(`[${ts}] [${level.toUpperCase()}] ${msg}${metaStr}`);
}

const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 3000;

// ── Security & Logging ──────────────────────────────────
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
}));
app.use(morgan(':method :url :status :res[content-length] - :response-time ms'));

// Routes are imported below at line ~88

// ── CORS — restrict to configured origin ────────────────
app.use(cors());

// Google Identity Services (Sign-In) requires specific Cross-Origin headers
app.use((req, res, next) => {
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
    res.setHeader('Cross-Origin-Embedder-Policy', 'unsafe-none');
    next();
});

app.use(express.json({ limit: '100kb' }));
app.use(express.static(path.join(__dirname, '..', 'public')));

// ── Rate limiting ───────────────────────────────────────
const generalLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Çok fazla istek. Lütfen biraz bekleyin.' }
});
const chatLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Çok fazla mesaj. Lütfen biraz bekleyin.' }
});
app.use('/api/', generalLimiter);

// ── In-memory Data Cache ────────────────────────────────
const dataCache = {};
function loadDataFile(name) {
    const filePath = path.join(__dirname, 'data', `${name}.json`);
    try {
        dataCache[name] = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        log('info', `Data loaded: ${name}`, { count: Array.isArray(dataCache[name]) ? dataCache[name].length : 'object' });
    } catch (e) {
        log('error', `Failed to load ${name}.json`, { error: e.message });
        dataCache[name] = [];
    }
}

// Load all data files into memory at startup
['hadiths', 'duas', 'esmaul-husna', 'ayets'].forEach(loadDataFile);

// ── Routes ─────────────────────────────────────────────
const authRoutes = require('./routes/auth');
const userDataRoutes = require('./routes/userData');

app.use('/api/auth', authRoutes);
app.use('/api/user-data', userDataRoutes);

// ── Validation Helpers ──────────────────────────────────
const VALID_MADHABS = ['Hanefi', 'Şafii', 'Maliki', 'Hanbeli'];

function validateChatInput(body) {
    const { message, madhab, history } = body;

    if (!message || typeof message !== 'string' || !message.trim()) {
        return { valid: false, error: 'Mesaj boş olamaz.', status: 400 };
    }
    if (message.length > 1000) {
        return { valid: false, error: 'Mesaj çok uzun. Maksimum 1000 karakter.', status: 400 };
    }
    if (madhab && !VALID_MADHABS.includes(madhab)) {
        return { valid: false, error: 'Geçersiz mezhep seçimi.', status: 400 };
    }
    if (history && (!Array.isArray(history) || history.length > 20)) {
        return { valid: false, error: 'Geçersiz konuşma geçmişi.', status: 400 };
    }
    return { valid: true };
}

// ── Admin Auth Middleware ────────────────────────────────
function requireAdmin(req, res, next) {
    const secret = req.headers['x-admin-secret'];
    if (!secret || secret !== process.env.ADMIN_SECRET) {
        log('warn', 'Unauthorized admin access attempt', { ip: req.ip });
        return res.status(403).json({ error: 'Yetkisiz erişim.' });
    }
    next();
}

// ═══════════════════════════════════════════════════════
// API ROUTES
// ═══════════════════════════════════════════════════════

// ── Chat API ────────────────────────────────────────────
app.post('/api/chat', chatLimiter, async (req, res) => {
    try {
        const validation = validateChatInput(req.body);
        if (!validation.valid) {
            return res.status(validation.status).json({ error: validation.error });
        }

        const { message, madhab = 'Hanefi', category = '', history = [] } = req.body;

        // Generate AI response with conversation history
        const result = await generateResponse(message, madhab, category, history);

        log('info', 'Chat response generated', {
            msgLen: message.length,
            madhab,
            success: result.success
        });

        res.json({
            text: result.text,
            sources: result.sources,
            success: result.success,
            ragUsed: false
        });
    } catch (error) {
        log('error', 'Chat error', { error: error.message });
        res.status(500).json({ error: 'Sunucu hatası.', text: 'Üzgünüm, bir hata oluştu.' });
    }
});

// ── Chat Stream API (SSE) ───────────────────────────────
app.post('/api/chat/stream', chatLimiter, async (req, res) => {
    try {
        const validation = validateChatInput(req.body);
        if (!validation.valid) {
            return res.status(validation.status).json({ error: validation.error });
        }

        const { message, madhab = 'Hanefi', category = '', history = [] } = req.body;

        // Set headers for Server-Sent Events
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        // Wait for the stream to complete
        await generateResponseStream(message, madhab, category, history, res);

    } catch (error) {
        log('error', 'Chat stream error', { error: error.message });
        if (!res.headersSent) {
            res.status(500).json({ error: 'Sunucu hatası.' });
        } else {
            res.write(`data: ${JSON.stringify({ type: 'error', text: 'Üzgünüm, bir hata oluştu.' })}\n\n`);
            res.end();
        }
    }
});

// ── Prayer Times API (via Aladhan) ──────────────────────
app.get('/api/prayer-times', async (req, res) => {
    try {
        let { lat, lng, method } = req.query;
        lat = parseFloat(lat) || 41.0082;
        lng = parseFloat(lng) || 28.9784;
        method = parseInt(method) || 13;

        // Validate coordinate ranges
        if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
            return res.status(400).json({ error: 'Geçersiz koordinatlar.' });
        }

        const today = new Date();
        const date = `${today.getDate()}-${today.getMonth() + 1}-${today.getFullYear()}`;

        const url = `https://api.aladhan.com/v1/timings/${date}?latitude=${lat}&longitude=${lng}&method=${method}`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.code === 200) {
            const t = data.data.timings;
            res.json({
                success: true,
                timings: {
                    Fajr: t.Fajr,
                    Sunrise: t.Sunrise,
                    Dhuhr: t.Dhuhr,
                    Asr: t.Asr,
                    Maghrib: t.Maghrib,
                    Isha: t.Isha
                },
                date: data.data.date.hijri,
                location: { lat, lng }
            });
        } else {
            res.status(500).json({ error: 'Prayer times unavailable' });
        }
    } catch (error) {
        log('error', 'Prayer times error', { error: error.message });
        res.status(500).json({ error: error.message });
    }
});

// ── Daily Hadith API ────────────────────────────────────
app.get('/api/hadith', (req, res) => {
    try {
        const hadiths = dataCache.hadiths;
        if (!hadiths || hadiths.length === 0) {
            return res.status(500).json({ error: 'Hadis verisi bulunamadı.' });
        }

        const now = new Date();
        const start = new Date(now.getFullYear(), 0, 0);
        const dayOfYear = Math.floor((now - start) / 86400000);
        const index = dayOfYear % hadiths.length;

        res.json({
            success: true,
            hadith: hadiths[index],
            dayOfYear: dayOfYear
        });
    } catch (error) {
        log('error', 'Hadith error', { error: error.message });
        res.status(500).json({ error: error.message });
    }
});

// ── Duas API ────────────────────────────────────────────
app.get('/api/duas', (req, res) => {
    try {
        const duas = dataCache.duas;
        if (!duas) {
            return res.status(500).json({ error: 'Dua verisi bulunamadı.' });
        }
        res.json({ success: true, categories: duas });
    } catch (error) {
        log('error', 'Duas error', { error: error.message });
        res.status(500).json({ error: error.message });
    }
});

// ── Esmaül Hüsna API ───────────────────────────────────
app.get('/api/esmaul-husna', (req, res) => {
    try {
        const names = dataCache['esmaul-husna'];
        if (!names) {
            return res.status(500).json({ error: 'Esmaül Hüsna verisi bulunamadı.' });
        }
        res.json({ success: true, names });
    } catch (error) {
        log('error', 'Esmaul Husna error', { error: error.message });
        res.status(500).json({ error: error.message });
    }
});

// ── Daily Ayet API ──────────────────────────────────────
app.get('/api/ayet', (req, res) => {
    try {
        const ayets = dataCache.ayets;
        if (!ayets || ayets.length === 0) {
            return res.status(500).json({ error: 'Ayet verisi bulunamadı.' });
        }
        const now = new Date();
        const start = new Date(now.getFullYear(), 0, 0);
        const dayOfYear = Math.floor((now - start) / 86400000);
        const index = dayOfYear % ayets.length;
        res.json({ success: true, ayet: ayets[index] });
    } catch (error) {
        log('error', 'Ayet error', { error: error.message });
        res.status(500).json({ error: error.message });
    }
});

// ── App Version API ─────────────────────────────────────
app.get('/api/version', (req, res) => {
    res.json({ version: APP_VERSION });
});

// ── Fallback to index.html (Express 4 syntax) ──────────
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// ── Start Server / Export for Serverless ────────────────
if (process.env.VERCEL !== '1') {
    app.listen(PORT, () => {
        log('info', `🕌 Mollam Server v${APP_VERSION} running at http://localhost:${PORT}`);
        log('info', `🤖 Gemini API: Connected`);
        log('info', `🔒 CORS: open`);
    });
}

// Export for Vercel Serverless Function
module.exports = app;
