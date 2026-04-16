const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const Post = require('../models/post');
const User = require('../models/user');
const Notification = require('../models/notification');

// --- Multer Configuration ---
const storage = multer.diskStorage({
    destination: (req, file, cb) => { 
        cb(null, './public/images/uploads'); 
    },
    filename: (req, file, cb) => { 
        cb(null, Date.now() + path.extname(file.originalname)); 
    }
});

const upload = multer({ 
    storage: storage,
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png|gif|mp4|mov|avi|mkv/;
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = filetypes.test(file.mimetype);
        if (mimetype && extname) return cb(null, true);
        cb(new Error("Error: Only Images and Videos are allowed!"));
    }
});

const isLoggedIn = (req, res, next) => {
    if (req.session.userId) return next();
    res.redirect('/login');
};

// --- 1. GET: Create Page ---
router.get('/create', isLoggedIn, async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);
        res.render('create', { user });
    } catch (err) {
        res.status(500).send("Error loading create page");
    }
});

// --- 2. POST: Create Post/Reel ---
router.post('/create', isLoggedIn, upload.single('image'), async (req, res) => {
    try {
        if (!req.file) return res.send("Please select a file to upload.");
        const isVideo = req.file.mimetype.startsWith('video/');
        const newPost = new Post({
            user: req.session.userId, 
            image: '/images/uploads/' + req.file.filename,
            caption: req.body.caption,
            type: isVideo ? 'video' : 'image'
        });
        await newPost.save();
        res.redirect(isVideo ? '/reels' : '/feed');
    } catch (err) { 
        res.status(500).send("Error saving post."); 
    }
});

// --- 3. GET: Single Post Detail (With Navigation Logic) ---
router.get('/:postId', isLoggedIn, async (req, res) => {
    try {
        const post = await Post.findById(req.params.postId).populate('user');
        const user = await User.findById(req.session.userId);
        
        if (!post) return res.status(404).render('404', { user });

        // Logic to find the "Next Post" for the same user
        const nextPost = await Post.findOne({
            user: post.user._id,
            _id: { $gt: post._id } // Finds posts created after this one
        }).sort({ _id: 1 }); // Sort to get the very next one

        res.render('postDetail', { 
            post, 
            user, 
            nextPostId: nextPost ? nextPost._id : null 
        });
    } catch (err) {
        console.error(err);
        res.redirect('/feed');
    }
});

// --- 4. POST: Like Toggle ---
router.post('/:postId/like', isLoggedIn, async (req, res) => {
    try {
        const post = await Post.findById(req.params.postId);
        const userId = req.session.userId;
        const currentUser = await User.findById(userId);
        const isLiking = !post.likes.includes(userId);

        if (isLiking) {
            post.likes.push(userId);
            if (String(post.user) !== String(userId)) {
                await Notification.create({
                    recipient: post.user,
                    sender: userId,
                    type: 'like',
                    post: post._id
                });
            }
        } else {
            post.likes.pull(userId);
        }
        await post.save();

        res.status(200).json({ 
            success: true, 
            action: isLiking ? 'like' : 'unlike',
            likesCount: post.likes.length,
            postOwnerId: post.user,
            senderPic: currentUser.profilePic
        });
    } catch (err) { 
        res.status(500).json({ error: "Like failed" }); 
    }
});

// --- 5. POST: Comment ---
router.post('/:postId/comment', isLoggedIn, async (req, res) => {
    try {
        const post = await Post.findById(req.params.postId);
        const userId = req.session.userId;
        const currentUser = await User.findById(userId);

        const newComment = { user: userId, text: req.body.text };
        post.comments.push(newComment);
        await post.save();

        if (String(post.user) !== String(userId)) {
            await Notification.create({
                recipient: post.user,
                sender: userId,
                type: 'comment',
                post: post._id,
                text: req.body.text
            });
        }

        const updatedPost = await Post.findById(post._id).populate('comments.user', 'username profilePic');
        const savedComment = updatedPost.comments[updatedPost.comments.length - 1];

        res.status(200).json({ 
            success: true, 
            comment: savedComment, 
            postId: post._id,
            postOwnerId: post.user,
            senderPic: currentUser.profilePic
        });
    } catch (err) { 
        res.status(500).json({ error: "Comment failed" }); 
    }
});

// --- 6. GET: Fetch Comments API ---
router.get('/api/comments/:postId', async (req, res) => {
    try {
        const post = await Post.findById(req.params.postId)
            .populate('comments.user', 'username profilePic');
        if (!post) return res.status(404).json({ error: "Post not found" });
        res.json({ comments: post.comments });
    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
});

module.exports = router;