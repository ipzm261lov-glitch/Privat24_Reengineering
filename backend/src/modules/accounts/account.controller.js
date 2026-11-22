
const accountService = require('./account.service');

// Створення банківського рахунку
async function createAccount(req, res) {
    try {
        const userId = req.user.id;

        if (!userId || typeof userId !== 'string') {
            return res.status(400).json({
                status: 'error',
                message: 'User ID is required'
            });
        }

        const account = await accountService.createAccount({ userId });

        return res.status(201).json({
            status: 'success',
            message: 'Account created successfully',
            data: account
        });

    } catch (error) {
        if (error.message === 'User not found') {
            return res.status(404).json({
                status: 'error',
                message: error.message
            });
        }

        console.error('Account creation failed:', error);

        return res.status(500).json({
            status: 'error',
            message: 'Internal server error'
        });
    }
}

// Отримання всіх рахунків авторизованого користувача
async function getUserAccounts(req, res) {
    try {
        const userId = req.user.id;

        const accounts = await accountService.getAccountsByUserId(userId);

        return res.status(200).json({
            status: 'success',
            data: accounts
        });

    } catch (error) {
        console.error('Get user accounts failed:', error);

        return res.status(500).json({
            status: 'error',
            message: 'Internal server error'
        });
    }
}

// Отримання окремого рахунку з перевіркою власника
async function getAccount(req, res) {
    try {
        const account = await accountService.getAccountById(
            req.params.id,
            req.user.id
        );

        if (!account) {
            return res.status(404).json({
                status: 'error',
                message: 'Account not found'
            });
        }

        return res.status(200).json({
            status: 'success',
            data: account
        });

    } catch (error) {
        console.error('Get account failed:', error);

        return res.status(500).json({
            status: 'error',
            message: 'Internal server error'
        });
    }
}

// Зміна статусу банківського рахунку
async function updateAccountStatus(req, res) {
    try {
        const { status } = req.body;
        const { id } = req.params;

        const allowedStatuses = ['ACTIVE', 'BLOCKED', 'CLOSED'];

        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({
                status: 'error',
                message: 'Invalid account status'
            });
        }

        const account = await accountService.updateAccountStatus(
            id,
            req.user.id,
            status
        );

        return res.status(200).json({
            status: 'success',
            message: 'Account status updated successfully',
            data: account
        });

    } catch (error) {
        if (error.message === 'Account not found') {
            return res.status(404).json({
                status: 'error',
                message: error.message
            });
        }

        if (error.message === 'Invalid account status transition') {
            return res.status(409).json({
                status: 'error',
                message: error.message
            });
        }

        console.error('Account status update failed:', error);

        return res.status(500).json({
            status: 'error',
            message: 'Internal server error'
        });
    }
}

module.exports = {
    createAccount,
    getUserAccounts,
    getAccount,
    updateAccountStatus
};
