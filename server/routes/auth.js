const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
const UserData = require('../models/UserData');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Token oluşturucu
const generateToken = (id) => {
    if (!process.env.JWT_SECRET) {
        throw new Error('FATAL: JWT_SECRET environment variable is missing!');
    }
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });
};

// @route   POST /api/auth/register
// @desc    Yeni kullanıcı kaydı
// @access  Public
router.post('/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ error: 'Lütfen tüm alanları doldurun.' });
        }

        // Kullanıcı var mı kontrol et
        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ error: 'Bu e-posta adresi zaten kullanılıyor.' });
        }

        // Kullanıcı oluştur
        const user = await User.create({
            name,
            email,
            password
        });

        if (user) {
            // Create default UserData
            await UserData.create({ user: user._id });

            res.status(201).json({
                _id: user.id,
                name: user.name,
                email: user.email,
                avatar: user.avatar,
                token: generateToken(user._id)
            });
        } else {
            res.status(400).json({ error: 'Geçersiz kullanıcı verisi.' });
        }
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ error: 'Sunucu hatası.' });
    }
});

// @route   POST /api/auth/login
// @desc    Kullanıcı girişi & token al
// @access  Public
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email }).select('+password');

        if (user && (await user.matchPassword(password))) {
            res.json({
                _id: user.id,
                name: user.name,
                email: user.email,
                avatar: user.avatar,
                token: generateToken(user._id)
            });
        } else {
            res.status(401).json({ error: 'Geçersiz e-posta veya şifre.' });
        }
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Sunucu hatası.' });
    }
});

// @route   POST /api/auth/google
// @desc    Google hesabı ile giriş/kayıt
// @access  Public
router.post('/google', async (req, res) => {
    try {
        const { idToken } = req.body;

        // Token'ı Google sunucularında doğrula
        const ticket = await client.verifyIdToken({
            idToken,
            audience: process.env.GOOGLE_CLIENT_ID
        });

        const { name, email, picture, sub: googleId } = ticket.getPayload();

        // Kullanıcıyı e-posta ile ara
        let user = await User.findOne({ email });

        if (!user) {
            // Yoksa yeni kullanıcı oluştur
            user = await User.create({
                name,
                email,
                googleId,
                avatar: picture
            });
            // Yeni kullanıcı için veritabanı ayar profili aç
            await UserData.create({ user: user._id });
        } else if (!user.googleId) {
            // Kullanıcı var ama google id'si yoksa bağla
            user.googleId = googleId;
            if (user.avatar === 'default.png') user.avatar = picture;
            await user.save();
        }

        res.json({
            _id: user.id,
            name: user.name,
            email: user.email,
            avatar: user.avatar,
            token: generateToken(user._id)
        });

    } catch (error) {
        console.error('Google Auth Error:====================');
        console.error(error.stack || error);
        console.error('======================================');
        res.status(401).json({ error: 'Google kimlik doğrulaması başarısız oldu.', details: error.message });
    }
});

module.exports = router;
