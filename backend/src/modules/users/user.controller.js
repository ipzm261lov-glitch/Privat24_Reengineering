const userService = require('./user.service');

// Реєстрація користувача
async function registerUser(req, res) {
    try {
        const { username, password, fullName } = req.body;

        // Перевірка обов'язкових полів
        if (!username || !password) {
            return res.status(400).json({
                status: 'error',
                message: 'Username and password are required'
            });
        }

        if (typeof username !== 'string' ||
            typeof password !== 'string' ||
            (fullName !== undefined && typeof fullName !== 'string')) {
            return res.status(400).json({
                status: 'error',
                message: 'Invalid input data'
            });
        }

        if (!username.trim() || !password.trim()) {
            return res.status(400).json({
                status: 'error',
                message: 'Username and password cannot be empty'
            });
        }

        const user = await userService.createUser({
            username: username.trim(),
            password,
            fullName: fullName?.trim() || undefined
        });

        return res.status(201).json({
            status: 'success',
            message: 'User registered successfully',
            data: user
        });

    } catch (error) {
        if (error.message === 'Username already exists') {
            return res.status(409).json({
                status: 'error',
                message: error.message
            });
        }

        console.error('User registration failed:', error);

        return res.status(500).json({
            status: 'error',
            message: 'Internal server error'
        });
    }
}

// Отримання користувача за ID
async function getUser(req, res) {
    try {
        const user = await userService.getUserById(req.params.id);

        if (!user) {
            return res.status(404).json({
                status: 'error',
                message: 'User not found'
            });
        }

        return res.status(200).json({
            status: 'success',
            data: user
        });

    } catch (error) {
        console.error('Get user failed:', error);

        return res.status(500).json({
            status: 'error',
            message: 'Internal server error'
        });
    }
}

module.exports = {
    registerUser,
    getUser
};