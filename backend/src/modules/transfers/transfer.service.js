const prisma = require('../../config/database');

// Виконання переказу коштів між рахунками
async function createTransfer({
    fromAccountId,
    toAccountId,
    amount,
    description,
    userId
}) {

    // Перевірка коректності суми
    const transferAmount = Number(amount);

    if (!Number.isFinite(transferAmount) || transferAmount <= 0) {
        throw new Error('Invalid transfer amount');
    }

    if (
        !Number.isSafeInteger(Math.round(transferAmount * 100)) ||
        Math.round(transferAmount * 100) / 100 !== transferAmount
    ) {
        throw new Error('Invalid transfer amount');
    }

    // Перевірка, що рахунки різні
    if (fromAccountId === toAccountId) {
        throw new Error('Cannot transfer to the same account');
    }

    // Перевірка наявності ідентифікатора користувача
    if (!userId) {
        throw new Error('Account not found');
    }

    // Усі зміни виконуються в одній транзакції БД
    return prisma.$transaction(async (tx) => {

        // Блокуємо обидва рахунки для уникнення конкурентних переказів
        const accountIds = [fromAccountId, toAccountId].sort();

        const accounts = await tx.$queryRaw`
            SELECT id, "accountNumber", balance, currency, status, "userId"
            FROM "Account"
            WHERE id IN (${accountIds[0]}::uuid, ${accountIds[1]}::uuid)
            ORDER BY id
            FOR UPDATE
        `;

        const fromAccount = accounts.find(
            account => account.id === fromAccountId
        );

        const toAccount = accounts.find(
            account => account.id === toAccountId
        );

        if (!fromAccount || !toAccount) {
            throw new Error('Account not found');
        }

        // Перевірка власника рахунку відправника
        if (fromAccount.userId !== userId) {
            throw new Error('Account not found');
        }

        // Перевірка статусу рахунків
        if (
            fromAccount.status !== 'ACTIVE' ||
            toAccount.status !== 'ACTIVE'
        ) {
            throw new Error('Account is not active');
        }

        // Перевірка валюти
        if (fromAccount.currency !== toAccount.currency) {
            throw new Error('Currency mismatch');
        }

        // Перевірка достатності коштів
        if (Number(fromAccount.balance) < transferAmount) {
            throw new Error('Insufficient funds');
        }

        // Розрахунок нових балансів у копійках
        const amountInKopecks = Math.round(transferAmount * 100);

        const newSenderBalance =
            Number(fromAccount.balance) - amountInKopecks / 100;

        const newReceiverBalance =
            Number(toAccount.balance) + amountInKopecks / 100;

        // Оновлення балансів рахунків
        await tx.account.update({
            where: { id: fromAccountId },
            data: { balance: newSenderBalance }
        });

        await tx.account.update({
            where: { id: toAccountId },
            data: { balance: newReceiverBalance }
        });

        // Створення запису про переказ
        const transfer = await tx.transfer.create({
            data: {
                fromAccountId,
                toAccountId,
                amount: transferAmount,
                description,
                status: 'COMPLETED',
                completedAt: new Date()
            }
        });

        // Запис списання коштів
        await tx.transaction.create({
            data: {
                accountId: fromAccountId,
                transferId: transfer.id,
                type: 'DEBIT',
                amount: transferAmount,
                balanceAfter: newSenderBalance
            }
        });

        // Запис зарахування коштів
        await tx.transaction.create({
            data: {
                accountId: toAccountId,
                transferId: transfer.id,
                type: 'CREDIT',
                amount: transferAmount,
                balanceAfter: newReceiverBalance
            }
        });

        return {
            id: transfer.id,
            fromAccountId,
            toAccountId,
            amount: transfer.amount,
            description: transfer.description,
            status: transfer.status,
            createdAt: transfer.createdAt,
            completedAt: transfer.completedAt,
            senderBalance: newSenderBalance,
            receiverBalance: newReceiverBalance
        };
    });
}

module.exports = {
    createTransfer
};
