const express = require('express');
const router = express.Router();

const userController = require('./user.controller');

// Реєстрація користувача
router.post('/', userController.registerUser);

// Отримання користувача за ID
router.get('/:id', userController.getUser);

module.exports = router;