const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
    let token;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        try {
            // Token'ı al
            token = req.headers.authorization.split(' ')[1];

            // Token'ı doğrula
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // Kullanıcıyı bul ve isteğe ekle (şifre hariç)
            req.user = await User.findById(decoded.id).select('-password');
            if (!req.user) {
                return res.status(401).json({ error: 'Yetkisiz erişim, kullanıcı bulunamadı' });
            }

            next();
        } catch (error) {
            console.error(error);
            res.status(401).json({ error: 'Yetkisiz erişim, token başarısız' });
        }
    }

    if (!token) {
        res.status(401).json({ error: 'Yetkisiz erişim, token bulunamadı' });
    }
};

// Admin yetkilendirmesi
const admin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ error: 'Yönetici yetkisi gereklidir' });
    }
};

module.exports = { protect, admin };
