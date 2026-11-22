const crypto = require('crypto');
const prisma = require('../../config/database');

// Перевірка авторизації користувача
async function authenticateToken(req, res, next) {
    try {
        // Отримання токена із заголовка Authorization
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                status: 'error',
                message: 'Access token is required'
            });
        }

        const token = authHeader.split(' ')[1];

        if (!token) {
            return res.status(401).json({
                status: 'error',
                message: 'Invalid access token'
            });
        }

        // Хешування отриманого токена
        const tokenHash = crypto
            .createHash('sha256')
            .update(token)
            .digest('hex');

        // Пошук активної сесії
        const session = await prisma.session.findUnique({
            where: { tokenHash },
            include: {
                user: {
                    select: {
                        id: true,
                        username: true,
                        fullName: true
                    }
                }
            }
        });

        // Перевірка існування та терміну дії сесії
        if (!session || session.expiresAt <= new Date()) {
            return res.status(401).json({
                status: 'error',
                message: 'Invalid or expired access token'
            });
        }

        // Збереження інформації про користувача в запиті
        req.user = session.user;

        next();

    } catch (error) {
        console.error('Authentication failed:', error);

        return res.status(500).json({
            status: 'error',
            message: 'Internal server error'
        });
    }
}

module.exports = {
    authenticateToken
};