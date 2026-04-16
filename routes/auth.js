const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// UI Routes
router.get('/', (req, res) => res.redirect('/login'));
router.get('/login', (req, res) => res.render('login'));
router.get('/register', (req, res) => res.render('register'));

// Logic Routes
router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/logout', authController.logout);

module.exports = router;