const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Lütfen isim giriniz'],
    },
    email: {
        type: String,
        required: [true, 'Lütfen e-posta giriniz'],
        unique: true,
        match: [
            /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
            'Lütfen geçerli bir e-posta adresi giriniz'
        ]
    },
    password: {
        type: String,
        // Google auth uses this schema too, so password isn't always strictly required
        required: false,
        minlength: 6,
        select: false
    },
    googleId: {
        type: String,
        required: false
    },
    avatar: {
        type: String,
        default: 'default.png'
    },
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Şifre şifreleme middleware
userSchema.pre('save', async function () {
    if (!this.isModified('password') || !this.password) {
        return;
    }

    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

// Veritabanındaki şifre ile girilen şifreyi karşılaştırma
userSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
