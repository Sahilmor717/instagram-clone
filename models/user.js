const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: { 
        type: String, 
        required: true, 
        unique: true,
        trim: true
    },
    email: { 
        type: String, 
        required: true, 
        unique: true,
        lowercase: true // Ensures emails are stored in a consistent format
    },
    password: { 
        type: String, 
        required: true 
    },
    profilePic: { 
        type: String, 
        default: 'https://cdn-icons-png.flaticon.com/512/149/149071.png' 
    },
    bio: { 
        type: String, 
        default: '',
        maxlength: 150 // Standard Instagram bio limit
    },
    // Users who follow this person
    followers: [{ 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User' 
    }],
    // People this person is following
    following: [{ 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User' 
    }]
}, { timestamps: true });

// Optional: Add an index for faster searching by username
userSchema.index({ username: 'text' });

module.exports = mongoose.model('User', userSchema);