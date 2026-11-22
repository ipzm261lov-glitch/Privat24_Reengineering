
const prisma = require('../../config/database');

// Отримання історії операцій за рахунком
async function getTransactionsByAccountId(accountId, userId) {
    const account = await prisma.account.findFirst({
        where: {
            id: accountId,
            userId
        }
    });

    if (!account) {
        throw new Error('Account not found');
    }

    return prisma.transaction.findMany({
        where: { accountId },
        select: {
            id: true,
            type: true,
            amount: true,
            balanceAfter: true,
            createdAt: true,
            transferId: true
        },
        orderBy: {
            createdAt: 'desc'
        }
    });
}

// Поповнення банківського рахунку
async function depositToAccount({ accountId, userId, amount }) {
    const depositAmount = Number(amount);

    if (
        !Number.isFinite(depositAmount) ||
        depositAmount <= 0 ||
        !Number.isSafeInteger(Math.round(depositAmount * 100)) ||
        Math.round(depositAmount * 100) / 100 !== depositAmount
    ) {
        throw new Error('Invalid deposit amount');
    }

    return prisma.$transaction(async (tx) => {
        const accounts = await tx.$queryRaw`
            SELECT id, balance, status, "userId"
            FROM "Account"
            WHERE id = ${accountId}::uuid
            FOR UPDATE
        `;

        const account = accounts[0];

        if (!account || account.userId !== userId) {
            throw new Error('Account not found');
        }

        if (account.status !== 'ACTIVE') {
            throw new Error('Account is not active');
        }

        const newBalance = Number(account.balance) + depositAmount;

        const updatedAccount = await tx.account.update({
            where: { id: accountId },
            data: { balance: newBalance }
        });

        const transaction = await tx.transaction.create({
            data: {
                accountId,
                type: 'CREDIT',
                amount: depositAmount,
                balanceAfter: newBalance
            }
        });

        return {
            transaction,
            balance: updatedAccount.balance
        };
    });
}

module.exports = {
    getTransactionsByAccountId,
    depositToAccount
};
