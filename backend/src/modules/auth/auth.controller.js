const authService = require('./auth.service');

// Авторизація користувача
async function login(req, res) {
    try {
        const { username, password } = req.body || {};

        // Перевірка обов'язкових полів
        if (
            typeof username !== 'string' ||
            typeof password !== 'string' ||
            !username.trim() ||
            !password
        ) {
            return res.status(400).json({
                status: 'error',
                message: 'Username and password are required'
            });
        }

        // Виклик сервісу авторизації
        const result = await authService.login({
            username: username.trim(),
            password
        });

        return res.status(200).json({
            status: 'success',
            message: 'Login successful',
            data: result
        });

    } catch (error) {
        if (error.message === 'Invalid credentials') {
            return res.status(401).json({
                status: 'error',
                message: 'Invalid username or password'
            });
        }

        console.error('Login failed:', error);

        return res.status(500).json({
            status: 'error',
            message: 'Internal server error'
        });
    }
}

// Отримання інформації про авторизованого користувача
function getProfile(req, res) {
    return res.status(200).json({
        status: 'success',
        data: {
            user: req.user
        }
    });
}

module.exports = {
    login,
    getProfile
};