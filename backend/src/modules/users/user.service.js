const prisma = require('../../config/database');
const bcrypt = require('bcryptjs');

// Реєстрація нового користувача
async function createUser({ username, password, fullName }) {
    // Перевіряємо, чи існує такий логін
    const existingUser = await prisma.user.findUnique({
        where: { username }
    });

    if (existingUser) {
        throw new Error('Username already exists');
    }

    // Хешуємо пароль
    const passwordHash = await bcrypt.hash(password, 12);

    // Створюємо користувача в базі даних
    const user = await prisma.user.create({
        data: {
            username,
            passwordHash,
            fullName
        },
        select: {
            id: true,
            username: true,
            fullName: true,
            createdAt: true
        }
    });

    return user;
}

// Отримання користувача за ID
async function getUserById(id) {
    return prisma.user.findUnique({
        where: { id },
        select: {
            id: true,
            username: true,
            fullName: true,
            createdAt: true
        }
    });
}

// Отримання користувача за логіном для авторизації
async function getUserByUsername(username) {
    return prisma.user.findUnique({
        where: { username }
    });
}

module.exports = {
    createUser,
    getUserById,
    getUserByUsername
};