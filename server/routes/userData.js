const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const UserData = require('../models/UserData');

// @route   GET /api/user-data
// @desc    Kullanıcının verilerini (ayarlar, favoriler vb.) getir
// @access  Private
router.get('/', protect, async (req, res) => {
    try {
        let userData = await UserData.findOne({ user: req.user._id });

        if (!userData) {
            // Eğer yoksa (normalde kayıtta oluşur ama) oluştur
            userData = await UserData.create({ user: req.user._id });
        }

        res.json(userData);
    } catch (error) {
        console.error('UserData GET error:', error);
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

// @route   PUT /api/user-data/settings
// @desc    Kullanıcı ayarlarını güncelle
// @access  Private
router.put('/settings', protect, async (req, res) => {
    try {
        const userData = await UserData.findOne({ user: req.user._id });
        if (!userData) return res.status(404).json({ error: 'Kullanıcı verisi bulunamadı' });

        // Gelen verilerle ayarları birleştir
        userData.settings = { ...userData.settings, ...req.body };
        const updatedData = await userData.save();

        res.json(updatedData.settings);
    } catch (error) {
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

// @route   POST /api/user-data/favorites
// @desc    Favoriye yeni bir dua/ayet/hadis ekle
// @access  Private
router.post('/favorites', protect, async (req, res) => {
    try {
        const { type, contentId, title, text } = req.body;
        const userData = await UserData.findOne({ user: req.user._id });

        // Belki zaten favoridedir kontrolü yapılabilir
        const exists = userData.favorites.find(f => f.contentId === contentId && f.type === type);
        if (exists) return res.status(400).json({ error: 'Zaten favorilerde ekli.' });

        userData.favorites.push({ type, contentId, title, text });
        await userData.save();

        res.json(userData.favorites);
    } catch (error) {
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

// @route   DELETE /api/user-data/favorites/:id
// @desc    Favoriyi sil
// @access  Private
router.delete('/favorites/:id', protect, async (req, res) => {
    try {
        const userData = await UserData.findOne({ user: req.user._id });
        userData.favorites = userData.favorites.filter(f => f._id.toString() !== req.params.id);
        await userData.save();

        res.json(userData.favorites);
    } catch (error) {
        res.status(500).json({ error: 'Sunucu hatası' });
    }
});

// Daha sonra chat geçmişleri vs. eklenebilir.

module.exports = router;
