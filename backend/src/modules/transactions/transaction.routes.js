
const express = require('express');
const router = express.Router();

const transactionController = require('./transaction.controller');
const { authenticateToken } = require('../auth/auth.middleware');

// Історія операцій за рахунком
router.get(
    '/account/:accountId',
    authenticateToken,
    transactionController.getAccountTransactions
);

// Поповнення рахунку
router.post(
    '/deposit',
    authenticateToken,
    transactionController.depositToAccount
);

module.exports = router;
