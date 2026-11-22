
const express = require('express');
const router = express.Router();

const accountController = require('./account.controller');
const { authenticateToken } = require('../auth/auth.middleware');

// Усі маршрути рахунків потребують авторизації
router.post('/', authenticateToken, accountController.createAccount);
router.get('/user', authenticateToken, accountController.getUserAccounts);
router.get('/:id', authenticateToken, accountController.getAccount);
router.patch('/:id/status', authenticateToken, accountController.updateAccountStatus);

module.exports = router;
