const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
    user: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    // 🌟 Added 'type' to distinguish between standard Posts and Reels
    type: { 
        type: String, 
        enum: ['image', 'video'], 
        default: 'image' 
    },
    image: { 
        type: String, 
        required: true // This stores the URL path (e.g., /images/uploads/123.mp4)
    },
    caption: { 
        type: String, 
        default: '',
        trim: true
    },
    likes: [{ 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User' 
    }],
    comments: [
        {
            user: { 
                type: mongoose.Schema.Types.ObjectId, 
                ref: 'User' 
            },
            text: { 
                type: String, 
                required: true 
            },
            date: { 
                type: Date, 
                default: Date.now 
            }
        }
    ]
}, { timestamps: true });

// Indexing for faster feed loading
postSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Post', postSchema);