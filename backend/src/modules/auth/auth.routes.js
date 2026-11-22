const express = require('express');
const router = express.Router();

const authController = require('./auth.controller');
const { authenticateToken } = require('./auth.middleware');

// Авторизація користувача
router.post('/login', authController.login);

// Отримання профілю авторизованого користувача
router.get('/me', authenticateToken, authController.getProfile);

module.exports = router;