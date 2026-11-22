const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const prisma = require('../../config/database');
const userService = require('../users/user.service');

// Авторизація користувача
async function login({ username, password }) {

    // Пошук користувача за логіном
    const user = await userService.getUserByUsername(username);

    if (!user) {
        throw new Error('Invalid credentials');
    }

    // Перевірка пароля
    const isPasswordValid = await bcrypt.compare(
        password,
        user.passwordHash
    );

    if (!isPasswordValid) {
        throw new Error('Invalid credentials');
    }

    // Створення випадкового токена сесії
    const token = crypto.randomBytes(32).toString('hex');

    // Хешування токена перед збереженням у БД
    const tokenHash = crypto
        .createHash('sha256')
        .update(token)
        .digest('hex');

    // Створення сесії
    const session = await prisma.session.create({
        data: {
            tokenHash,
            userId: user.id,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
        }
    });

    return {
        token,
        expiresAt: session.expiresAt,
        user: {
            id: user.id,
            username: user.username,
            fullName: user.fullName
        }
    };
}

module.exports = {
    login
};