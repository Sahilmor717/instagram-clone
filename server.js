require('dotenv').config();
const express = require('express');
const path = require('path');
const session = require('express-session');
const connectDB = require('./config/db');
const http = require('http'); 
const { Server } = require('socket.io');

// Models
const Message = require('./models/message');
const User = require('./models/user');

const app = express();
const server = http.createServer(app);

// --- 1. Initialize Socket.io ---
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// --- 2. Database Connection ---
connectDB();

// --- 3. View Engine Setup ---
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// --- 4. Middlewares ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// --- 5. Session Setup ---
app.use(session({
    secret: process.env.SESSION_SECRET || 'ig-clone-secret',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 24 * 60 * 60 * 1000 } // 24 Hours
}));

// --- 6. Real-time Event Handling (Likes, Comments, Messages) ---
io.on('connection', (socket) => {
    console.log(`📡 New Connection: ${socket.id}`);

    // A. Handle Real-time Likes (Feed & Reels)
    socket.on('postLiked', (data) => {
        // broadcast.emit sends to everyone EXCEPT the person who liked
        socket.broadcast.emit('updateUI', data);
    });

    // B. Handle Real-time Comments (Feed & Reels Overlay)
    socket.on('newComment', (data) => {
        // io.emit sends to EVERYONE so the commenter sees their own comment too
        io.emit('displayComment', data);
    });

    // C. Handle Real-time Private Messaging
    socket.on('privateMessage', async (data) => {
        try {
            const { senderId, receiverId, text } = data;
            
            // Save message to MongoDB
            const newMessage = new Message({
                sender: senderId,
                receiver: receiverId,
                text: text
            });
            await newMessage.save();

            // Broadcast message back to the sender and receiver
            io.emit('receiveMessage', {
                senderId,
                receiverId,
                text,
                createdAt: newMessage.createdAt
            });
        } catch (err) {
            console.error("Socket Message Error:", err);
        }
    });

    socket.on('disconnect', () => {
        console.log('❌ User disconnected');
    });
});

// --- 7. Make Socket.io accessible in Routes (Optional) ---
app.use((req, res, next) => {
    req.io = io;
    next();
});

// --- 8. Modular Routes ---
app.use('/', require('./routes/auth'));     // Login, Register, Logout
app.use('/', require('./routes/users'));    // Profile, Reels, Search, Notifications
app.use('/post', require('./routes/posts')); // Create, Like, Comment
app.use('/', require('./routes/messages')); // Inbox, Individual Chats

// --- 9. Error Handling for 404 ---
app.use((req, res) => {
    res.status(404).render('404', { user: req.session.userId ? { username: 'User' } : null });
});

// --- 10. Start Server ---
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log('---------------------------------------------');
    console.log(`🚀 Server: http://localhost:${PORT}`);
    console.log(`💬 Status: Live & Real-time Connected`);
    console.log('---------------------------------------------');
});