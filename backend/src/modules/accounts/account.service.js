
const prisma = require('../../config/database');

// Створення банківського рахунку
async function createAccount({ userId }) {
    const user = await prisma.user.findUnique({
        where: { id: userId }
    });

    if (!user) {
        throw new Error('User not found');
    }

    const accountNumber = `UA${Date.now()}${Math.floor(Math.random() * 1000000)
        .toString()
        .padStart(6, '0')}`;

    return prisma.account.create({
        data: {
            accountNumber,
            balance: 0,
            currency: 'UAH',
            status: 'ACTIVE',
            userId
        },
        select: {
            id: true,
            accountNumber: true,
            balance: true,
            currency: true,
            status: true,
            createdAt: true
        }
    });
}

// Отримання всіх рахунків користувача
async function getAccountsByUserId(userId) {
    return prisma.account.findMany({
        where: { userId },
        select: {
            id: true,
            accountNumber: true,
            balance: true,
            currency: true,
            status: true,
            createdAt: true
        },
        orderBy: {
            createdAt: 'desc'
        }
    });
}

// Отримання рахунку за ID з перевіркою власника
async function getAccountById(id, userId) {
    return prisma.account.findFirst({
        where: {
            id,
            userId
        },
        select: {
            id: true,
            accountNumber: true,
            balance: true,
            currency: true,
            status: true,
            userId: true,
            createdAt: true
        }
    });
}

// Зміна статусу банківського рахунку
async function updateAccountStatus(id, userId, newStatus) {
    const account = await prisma.account.findFirst({
        where: {
            id,
            userId
        }
    });

    if (!account) {
        throw new Error('Account not found');
    }

    const allowedTransitions = {
        ACTIVE: ['BLOCKED', 'CLOSED'],
        BLOCKED: ['ACTIVE', 'CLOSED'],
        CLOSED: []
    };

    if (!allowedTransitions[account.status]?.includes(newStatus)) {
        throw new Error('Invalid account status transition');
    }

    return prisma.account.update({
        where: { id },
        data: {
            status: newStatus
        },
        select: {
            id: true,
            accountNumber: true,
            balance: true,
            currency: true,
            status: true,
            updatedAt: true
        }
    });
}

module.exports = {
    createAccount,
    getAccountsByUserId,
    getAccountById,
    updateAccountStatus
};
