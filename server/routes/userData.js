const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const UserData = require('../models/UserData');

// @route   GET /api/user-data/
// @desc    Get current user's synced data
// @access  Private
router.get('/', protect, async (req, res) => {
    try {
        let userData = await UserData.findOne({ user: req.user._id });
        if (!userData) {
            userData = await UserData.create({ user: req.user._id });
        }
        res.json({
            tasbihCount: userData.tasbihCount,
            goals: userData.goals,
            namazTracker: userData.namazTracker,
            favorites: userData.favorites,
            chatHistory: userData.chatHistory,
            streak: userData.streak,
            preferences: {
                theme: userData.settings.theme,
                madhab: userData.settings.defaultMadhab
            }
        });
    } catch (error) {
        console.error('UserData GET error:', error);
        res.status(500).json({ error: 'Server error retrieving data' });
    }
});

// @route   POST /api/user-data/
// @desc    Update user's synced data (upsert)
// @access  Private
router.post('/', protect, async (req, res) => {
    try {
        const { tasbihCount, goals, namazTracker, favorites, chatHistory, preferences, streak } = req.body;

        let userData = await UserData.findOne({ user: req.user._id });
        if (!userData) {
            userData = new UserData({ user: req.user._id });
        }

        if (tasbihCount !== undefined) userData.tasbihCount = tasbihCount;
        if (goals) userData.goals = goals;
        if (namazTracker) userData.namazTracker = namazTracker;
        if (favorites) userData.favorites = favorites;
        if (chatHistory) userData.chatHistory = chatHistory;
        if (streak) userData.streak = streak;

        if (preferences) {
            if (preferences.theme) userData.settings.theme = preferences.theme;
            if (preferences.madhab) userData.settings.defaultMadhab = preferences.madhab;
        }

        await userData.save();
        res.json({ success: true, message: 'Data synced successfully' });
    } catch (error) {
        console.error('UserData POST error:', error);
        res.status(500).json({ error: 'Server error saving data' });
    }
});

module.exports = router;
