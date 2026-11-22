
require('dotenv').config();

const request = require('supertest');
const app = require('../src/app');
const prisma = require('../src/config/database');

// Унікальний префікс, щоб тестові користувачі
// не перетиналися з реальними записами в БД
const testPrefix = `jest_user_${Date.now()}`;
const username = `${testPrefix}_01`;

let createdUserId;

afterAll(async () => {
    // Видаляємо лише користувачів, створених цим набором тестів
    await prisma.user.deleteMany({
        where: {
            username: {
                startsWith: testPrefix
            }
        }
    });

    await prisma.$disconnect();
});

describe('Users API', () => {

    test('POST /api/users — реєстрація нового користувача', async () => {
        const response = await request(app)
            .post('/api/users')
            .send({
                username,
                password: 'TestPass123',
                fullName: 'Jest Test User'
            });

        expect(response.status).toBe(201);
        expect(response.body.status).toBe('success');
        expect(response.body.data.username).toBe(username);
        expect(response.body.data.fullName).toBe('Jest Test User');

        // Пароль або його хеш не повинні повертатися клієнту
        expect(response.body.data).not.toHaveProperty('passwordHash');

        createdUserId = response.body.data.id;
    });

    test('POST /api/users — відмова при повторному логіні', async () => {
        const response = await request(app)
            .post('/api/users')
            .send({
                username,
                password: 'TestPass123',
                fullName: 'Duplicate User'
            });

        expect(response.status).toBe(409);
        expect(response.body.message).toBe('Username already exists');
    });

    test('GET /api/users/:id — отримання існуючого користувача', async () => {
        const response = await request(app)
            .get(`/api/users/${createdUserId}`);

        expect(response.status).toBe(200);
        expect(response.body.status).toBe('success');
        expect(response.body.data.id).toBe(createdUserId);
        expect(response.body.data.username).toBe(username);
        expect(response.body.data).not.toHaveProperty('passwordHash');
    });

    test('GET /api/users/:id — користувача не знайдено', async () => {
        const response = await request(app)
            .get('/api/users/00000000-0000-4000-8000-000000000000');

        expect(response.status).toBe(404);
        expect(response.body.message).toBe('User not found');
    });

    test('POST /api/users — перевірка обов’язкових полів', async () => {
        const response = await request(app)
            .post('/api/users')
            .send({
                username
            });

        expect(response.status).toBe(400);
        expect(response.body.message).toBe('Username and password are required');
    });

});

