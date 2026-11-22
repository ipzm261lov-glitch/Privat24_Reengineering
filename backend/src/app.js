
const express = require('express');
const path = require('path');

const app = express();
const prisma = require('./config/database');

const userRoutes = require('./modules/users/user.routes');
const accountRoutes = require('./modules/accounts/account.routes');
const transactionRoutes = require('./modules/transactions/transaction.routes');
const transferRoutes = require('./modules/transfers/transfer.routes');
const authRoutes = require('./modules/auth/auth.routes');

// Middleware для обробки JSON
app.use(express.json());

// API: Auth
app.use('/api/auth', authRoutes);

// API: Users та Accounts
app.use('/api/users', userRoutes);
app.use('/api/accounts', accountRoutes);

// API: Transactions
app.use('/api/transactions', transactionRoutes);

// API: Transfers
app.use('/api/transfers', transferRoutes);

// Перевірка працездатності API
app.get('/api/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        message: 'Privat24 Reengineering API is running'
    });
});

// Перевірка підключення до PostgreSQL через Prisma
app.get('/api/db-check', async (req, res) => {
    try {
        await prisma.$queryRaw`SELECT 1`;

        res.status(200).json({
            status: 'OK',
            message: 'Database connection successful'
        });
    } catch (error) {
        console.error('Database check failed:', error);

        res.status(500).json({
            status: 'error',
            message: 'Database connection failed'
        });
    }
});

// Роздача frontend
const frontendPath = path.join(__dirname, '../../frontend');

app.use(express.static(frontendPath));

// Головна сторінка
app.get('/', (req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
});

// Обробка неіснуючих маршрутів
app.use((req, res) => {
    res.status(404).json({
        status: 'error',
        message: 'Route not found'
    });
});

module.exports = app;
