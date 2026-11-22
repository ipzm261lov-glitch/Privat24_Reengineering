
require('dotenv').config();

const request = require('supertest');
const app = require('../src/app');
const prisma = require('../src/config/database');

const testPrefix = `jest_auth_${Date.now()}`;
const username = `${testPrefix}_01`;
const password = 'TestPass123';

let authToken;

beforeAll(async () => {
    // Створюємо окремого користувача для тестів авторизації
    await request(app)
        .post('/api/users')
        .send({
            username,
            password,
            fullName: 'Jest Auth User'
        })
        .expect(201);
});

afterAll(async () => {
    // Видаляємо лише створеного тестового користувача
    // Пов'язані сесії видаляться автоматично
    await prisma.user.deleteMany({
        where: {
            username: {
                startsWith: testPrefix
            }
        }
    });

    await prisma.$disconnect();
});

describe('Auth API', () => {

    test('POST /api/auth/login — успішна авторизація', async () => {
        const response = await request(app)
            .post('/api/auth/login')
            .send({ username, password });

        expect(response.status).toBe(200);
        expect(response.body.status).toBe('success');
        expect(response.body.data.token).toBeDefined();
        expect(response.body.data.user.username).toBe(username);

        authToken = response.body.data.token;
    });

    test('POST /api/auth/login — неправильний пароль', async () => {
        const response = await request(app)
            .post('/api/auth/login')
            .send({
                username,
                password: 'WrongPassword123'
            });

        expect(response.status).toBe(401);
        expect(response.body.message).toBe('Invalid username or password');
    });

    test('POST /api/auth/login — користувача не знайдено', async () => {
        const response = await request(app)
            .post('/api/auth/login')
            .send({
                username: `${testPrefix}_unknown`,
                password
            });

        expect(response.status).toBe(401);
    });

    test('POST /api/auth/login — відсутні обов’язкові поля', async () => {
        const response = await request(app)
            .post('/api/auth/login')
            .send({ username });

        expect(response.status).toBe(400);
        expect(response.body.message).toBe('Username and password are required');
    });

    test('GET /api/auth/me — доступ без токена заборонено', async () => {
        const response = await request(app)
            .get('/api/auth/me');

        expect(response.status).toBe(401);
        expect(response.body.message).toBe('Access token is required');
    });

    test('GET /api/auth/me — доступ із дійсним токеном', async () => {
        const response = await request(app)
            .get('/api/auth/me')
            .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.status).toBe('success');
        expect(response.body.data.user.username).toBe(username);
    });

});
