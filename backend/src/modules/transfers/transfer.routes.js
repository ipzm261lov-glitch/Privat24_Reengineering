const express = require('express');
const router = express.Router();

const transferController = require('./transfer.controller');
const { authenticateToken } = require('../auth/auth.middleware');

// Виконання переказу коштів — лише для авторизованих користувачів
router.post(
    '/',
    authenticateToken,
    transferController.createTransfer
);

module.exports = router;