const transferService = require('./transfer.service');

// Виконання переказу коштів
async function createTransfer(req, res) {
    try {
        const { fromAccountId, toAccountId, amount, description } = req.body;

        // Ідентифікатор авторизованого користувача
        const userId = req.user.id;

        // Перевірка обов'язкових полів
        if (
            !fromAccountId ||
            !toAccountId ||
            amount === undefined ||
            amount === null
        ) {
            return res.status(400).json({
                status: 'error',
                message: 'Sender account, recipient account and amount are required'
            });
        }

        if (
            typeof fromAccountId !== 'string' ||
            typeof toAccountId !== 'string' ||
            (description !== undefined && typeof description !== 'string')
        ) {
            return res.status(400).json({
                status: 'error',
                message: 'Invalid request data'
            });
        }

        const transfer = await transferService.createTransfer({
            fromAccountId,
            toAccountId,
            amount,
            description,
            userId
        });

        return res.status(201).json({
            status: 'success',
            message: 'Transfer completed successfully',
            data: transfer
        });

    } catch (error) {
        if (
            error.message === 'Invalid transfer amount' ||
            error.message === 'Cannot transfer to the same account'
        ) {
            return res.status(400).json({
                status: 'error',
                message: error.message
            });
        }

        if (error.message === 'Account not found') {
            return res.status(404).json({
                status: 'error',
                message: error.message
            });
        }

        if (
            error.message === 'Insufficient funds' ||
            error.message === 'Account is not active' ||
            error.message === 'Currency mismatch'
        ) {
            return res.status(409).json({
                status: '409',
                message: error.message
            });
        }

        console.error('Create transfer failed:', error);

        return res.status(500).json({
            status: 'error',
            message: 'Internal server error'
        });
    }
}

module.exports = {
    createTransfer
};