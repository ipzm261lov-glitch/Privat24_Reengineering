
const transactionService = require('./transaction.service');

// Отримання історії операцій за рахунком
async function getAccountTransactions(req, res) {
    try {
        const { accountId } = req.params;
        const userId = req.user.id;

        if (!accountId) {
            return res.status(400).json({
                status: 'error',
                message: 'Account ID is required'
            });
        }

        const transactions =
            await transactionService.getTransactionsByAccountId(
                accountId,
                userId
            );

        return res.status(200).json({
            status: 'success',
            data: transactions
        });

    } catch (error) {
        if (error.message === 'Account not found') {
            return res.status(404).json({
                status: 'error',
                message: error.message
            });
        }

        console.error('Get transactions failed:', error);

        return res.status(500).json({
            status: 'error',
            message: 'Internal server error'
        });
    }
}

// Поповнення рахунку
async function depositToAccount(req, res) {
    try {
        const { accountId, amount, description } = req.body;
        const userId = req.user.id;

        if (!accountId || amount === undefined) {
            return res.status(400).json({
                status: 'error',
                message: 'Account ID and amount are required'
            });
        }

        const result = await transactionService.depositToAccount({
            accountId,
            userId,
            amount,
            description
        });

        return res.status(201).json({
            status: 'success',
            message: 'Account deposit completed successfully',
            data: result
        });

    } catch (error) {
        if (error.message === 'Account not found') {
            return res.status(404).json({
                status: 'error',
                message: error.message
            });
        }

        if (
            error.message === 'Invalid deposit amount' ||
            error.message === 'Account is not active'
        ) {
            return res.status(400).json({
                status: 'error',
                message: error.message
            });
        }

        console.error('Account deposit failed:', error);

        return res.status(500).json({
            status: 'error',
            message: 'Internal server error'
        });
    }
}

module.exports = {
    getAccountTransactions,
    depositToAccount
};
