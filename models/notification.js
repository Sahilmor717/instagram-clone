const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    recipient: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    sender: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    type: { 
        type: String, 
        // 🌟 Added 'follow' to the enum
        enum: ['like', 'comment', 'follow'], 
        required: true 
    },
    post: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Post' 
    },
    text: { 
        type: String // Optional: can store comment text here
    },
    read: { 
        type: Boolean, 
        default: false 
    }
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);