const User = require('../models/user');
const bcrypt = require('bcryptjs');

// Handle Registration
exports.register = async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({ $or: [{ email }, { username }] });
        if (existingUser) {
            return res.send('User already exists. Please go back and log in.');
        }

        // Hash the password for security
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create and save the new user
        const newUser = new User({ username, email, password: hashedPassword });
        await newUser.save();

        // Send them to the login page
        res.redirect('/login');
    } catch (err) {
        console.error(err);
        res.send('Error in registration.');
    }
};

// Handle Login
exports.login = async (req, res) => {
    try {
        const { username, password } = req.body;
        
        // Find the user
        const user = await User.findOne({ username });
        if (!user) return res.send('User not found.');

        // Check password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.send('Incorrect password.');

        // Save their ID in the session (This keeps them logged in!)
        req.session.userId = user._id;
        res.redirect('/feed');
    } catch (err) {
        console.error(err);
        res.send('Error in login.');
    }
};

// Handle Logout
exports.logout = (req, res) => {
    req.session.destroy(() => {
        res.redirect('/login');
    });
};