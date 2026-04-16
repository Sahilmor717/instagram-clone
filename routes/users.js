const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const Post = require('../models/post');
const User = require('../models/user');
const Notification = require('../models/notification');

// Middleware to protect routes
const requireLogin = (req, res, next) => {
    if (!req.session.userId) return res.redirect('/login');
    next();
};

// Multer Config for Profile Pictures
const storage = multer.diskStorage({
    destination: (req, file, cb) => { cb(null, './public/images/profiles'); },
    filename: (req, file, cb) => { cb(null, 'profile-' + req.session.userId + '-' + Date.now() + path.extname(file.originalname)); }
});
const upload = multer({ storage: storage });

// --- 1. Home Feed (Images Only) ---
router.get('/feed', requireLogin, async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);
        const posts = await Post.find({ type: 'image' }) // Only show images in main feed
            .populate('user', 'username profilePic')
            .populate('comments.user', 'username')
            .sort({ createdAt: -1 });
        res.render('feed', { posts, user });
    } catch (err) { res.status(500).send("Error loading feed."); }
});

// --- 2. Reels Feed (Videos Only) ---
router.get('/reels', requireLogin, async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);
        const reels = await Post.find({ type: 'video' }) // Only show videos in reels
            .populate('user', 'username profilePic')
            .sort({ createdAt: -1 });
        res.render('reels', { reels, user });
    } catch (err) { 
        console.error(err);
        res.status(500).send("Error loading reels."); 
    }
});

// --- 3. Personal Profile ---
router.get('/profile', requireLogin, async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);
        const posts = await Post.find({ user: req.session.userId }).sort({ createdAt: -1 });
        res.render('profile', { user, posts, isOwner: true, currentUser: user });
    } catch (err) { res.status(500).send("Error loading profile."); }
});

// --- 4. View Other User's Profile ---
router.get('/user/:id', requireLogin, async (req, res) => {
    try {
        if (String(req.params.id) === String(req.session.userId)) return res.redirect('/profile');
        
        const user = await User.findById(req.params.id);
        const currentUser = await User.findById(req.session.userId);
        const posts = await Post.find({ user: req.params.id }).sort({ createdAt: -1 });
        
        res.render('profile', { user, posts, isOwner: false, currentUser });
    } catch (err) { res.status(404).send("User not found."); }
});

// --- 5. Follow/Unfollow Toggle Logic ---
router.post('/follow/:targetId', requireLogin, async (req, res) => {
    try {
        const targetUserId = req.params.targetId;
        const currentUserId = req.session.userId;

        if (targetUserId === currentUserId) {
            return res.status(400).json({ success: false, message: "You cannot follow yourself" });
        }

        const targetUser = await User.findById(targetUserId);
        const currentUser = await User.findById(currentUserId);

        const isFollowing = currentUser.following.includes(targetUserId);

        if (isFollowing) {
            currentUser.following.pull(targetUserId);
            targetUser.followers.pull(currentUserId);
            await Notification.findOneAndDelete({
                recipient: targetUserId,
                sender: currentUserId,
                type: 'follow'
            });
        } else {
            currentUser.following.push(targetUserId);
            targetUser.followers.push(currentUserId);
            await Notification.create({
                recipient: targetUserId,
                sender: currentUserId,
                type: 'follow'
            });
        }

        await currentUser.save();
        await targetUser.save();

        res.json({ 
            success: true, 
            isFollowing: !isFollowing, 
            followerCount: targetUser.followers.length 
        });
    } catch (err) {
        res.status(500).json({ success: false, error: "Action failed" });
    }
});

// --- 6. Edit Profile ---
router.get('/edit-profile', requireLogin, async (req, res) => {
    const user = await User.findById(req.session.userId);
    res.render('edit-profile', { user });
});

router.post('/edit-profile', requireLogin, upload.single('profilePic'), async (req, res) => {
    const updateData = { bio: req.body.bio };
    if (req.file) updateData.profilePic = '/images/profiles/' + req.file.filename;
    await User.findByIdAndUpdate(req.session.userId, updateData);
    res.redirect('/profile');
});

// --- 7. Search ---
router.get('/search', requireLogin, async (req, res) => {
    const query = req.query.username;
    let foundUsers = [];
    const user = await User.findById(req.session.userId);
    if (query) {
        foundUsers = await User.find({ 
            username: { $regex: query, $options: 'i' },
            _id: { $ne: req.session.userId } 
        }).select('username profilePic');
    }
    res.render('search', { foundUsers, query, user });
});

// --- 8. Notifications ---
router.get('/notifications', requireLogin, async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);
        const notifications = await Notification.find({ recipient: req.session.userId })
            .populate('sender', 'username profilePic')
            .populate('post', 'image')
            .sort({ createdAt: -1 });

        res.render('notifications', { notifications, user });
    } catch (err) {
        res.status(500).send("Error loading notifications.");
    }
});

module.exports = router;