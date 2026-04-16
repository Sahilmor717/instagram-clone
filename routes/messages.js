const express = require('express');
const router = express.Router();
const User = require('../models/user');
const Message = require('../models/message');

const requireLogin = (req, res, next) => {
    if (!req.session.userId) return res.redirect('/login');
    next();
};

// This MUST match the link in your sidebar
router.get('/messages', requireLogin, async (req, res) => {
    try {
        const user = await User.findById(req.session.userId)
            .populate('following', 'username profilePic')
            .populate('followers', 'username profilePic');
        
        // We pass the people you follow as the list of people you can chat with
        res.render('messages/inbox', { user, chatPartners: user.following });
    } catch (err) {
        console.error(err);
        res.status(500).send("Error loading inbox");
    }
});

// Route for individual chats
router.get('/messages/chat/:targetId', requireLogin, async (req, res) => {
    try {
        const me = req.session.userId;
        const them = req.params.targetId;
        const otherUser = await User.findById(them);
        const user = await User.findById(me);

        const messages = await Message.find({
            $or: [
                { sender: me, receiver: them },
                { sender: them, receiver: me }
            ]
        }).sort({ createdAt: 1 });

        res.render('messages/chat', { otherUser, messages, user });
    } catch (err) {
        res.status(500).send("Error loading chat");
    }
});

module.exports = router; // Ensure this is exported!