const mongoose = require('mongoose');

const userDataSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    // Uygulama Ayarları
    settings: {
        theme: { type: String, default: 'dark' },
        autoTheme: { type: Boolean, default: false },
        soundEnabled: { type: Boolean, default: true },
        notifications: { type: Boolean, default: false },
        arabicFontSize: { type: Number, default: 18 },
        defaultMadhab: { type: String, default: 'Hanefi' }
    },
    // Favorilere Eklenen İçerikler (Ayet, Dua vb.)
    favorites: [{
        text: String,
        time: String
    }],
    // Sohbet Geçmişi (Chat History)
    chatHistory: [{
        q: String,
        time: String
    }],
    // Tesbih İstatistikleri
    tasbihCount: { type: Number, default: 0 },
    // Namaz Takibi
    namazTracker: {
        Fajr: { type: Boolean, default: false },
        Dhuhr: { type: Boolean, default: false },
        Asr: { type: Boolean, default: false },
        Maghrib: { type: Boolean, default: false },
        Isha: { type: Boolean, default: false }
    },
    goals: [{
        t: String,
        d: { type: Boolean, default: false }
    }],
    // Günlük Seri (Streak)
    streak: {
        current: { type: Number, default: 0 },
        longest: { type: Number, default: 0 },
        lastActiveDate: { type: String }
    }
}, { timestamps: true });

userDataSchema.index({ user: 1 });

module.exports = mongoose.model('UserData', userDataSchema);
