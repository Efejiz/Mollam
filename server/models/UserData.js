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
        type: { type: String, enum: ['dua', 'ayet', 'hadis'] },
        contentId: String,       // JSON ids, or actual text
        title: String,
        text: String,
        addedAt: { type: Date, default: Date.now }
    }],
    // Tesbih İstatistikleri
    tesbihStats: {
        totalZikir: { type: Number, default: 0 },
        history: [{
            zikirName: String,
            count: Number,
            date: { type: Date, default: Date.now }
        }]
    },
    // Namaz Takibi
    prayerTracker: [{
        date: { type: String }, // DD-MM-YYYY format
        prayers: {
            fajr: { type: Boolean, default: false },
            dhuhr: { type: Boolean, default: false },
            asr: { type: Boolean, default: false },
            maghrib: { type: Boolean, default: false },
            isha: { type: Boolean, default: false }
        }
    }],
    // Günlük Seri (Streak)
    streak: {
        current: { type: Number, default: 0 },
        longest: { type: Number, default: 0 },
        lastActiveDate: { type: String }
    }
}, { timestamps: true });

module.exports = mongoose.model('UserData', userDataSchema);
