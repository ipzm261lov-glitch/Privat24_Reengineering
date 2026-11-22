
require('dotenv').config();

const request = require('supertest');
const crypto = require('crypto');
const app = require('../src/app');
const prisma = require('../src/config/database');

const testPrefix = `jest_transaction_${Date.now()}`;

let userId;
let secondUserId;
let accountId;
let secondAccountId;
let authToken;

beforeAll(async () => {
    // Створюємо першого тестового користувача
    const user = await prisma.user.create({
        data: {
            username: `${testPrefix}_user1`,
            passwordHash: 'test_hash'
        }
    });

    userId = user.id;

    // Створюємо другого тестового користувача
    const secondUser = await prisma.user.create({
        data: {
            username: `${testPrefix}_user2`,
            passwordHash: 'test_hash'
        }
    });

    secondUserId = secondUser.id;

    // Створюємо рахунок першого користувача
    const account = await prisma.account.create({
        data: {
            accountNumber: `UA${Date.now()}${Math.floor(Math.random() * 1000000)
                .toString().padStart(6, '0')}`,
            balance: 0,
            currency: 'UAH',
            status: 'ACTIVE',
            userId
        }
    });

    accountId = account.id;

    // Створюємо рахунок другого користувача
    const secondAccount = await prisma.account.create({
        data: {
            accountNumber: `UA${Date.now()}${Math.floor(Math.random() * 1000000)
                .toString().padStart(6, '0')}`,
            balance: 0,
            currency: 'UAH',
            status: 'ACTIVE',
            userId: secondUserId
        }
    });

    secondAccountId = secondAccount.id;

    // Створюємо тестову сесію авторизації
    authToken = crypto.randomBytes(32).toString('hex');

    const tokenHash = crypto
        .createHash('sha256')
        .update(authToken)
        .digest('hex');

    await prisma.session.create({
        data: {
            tokenHash,
            expiresAt: new Date(Date.now() + 60 * 60 * 1000),
            userId
        }
    });
});

afterAll(async () => {
    // Видаляємо тестові сесії
    await prisma.session.deleteMany({
        where: {
            userId: {
                in: [userId, secondUserId]
            }
        }
    });

    // Видаляємо тестові транзакції
    await prisma.transaction.deleteMany({
        where: {
            accountId: {
                in: [accountId, secondAccountId]
            }
        }
    });

    // Видаляємо тестові рахунки
    await prisma.account.deleteMany({
        where: {
            userId: {
                in: [userId, secondUserId]
            }
        }
    });

    // Видаляємо тестових користувачів
    await prisma.user.deleteMany({
        where: {
            id: {
                in: [userId, secondUserId]
            }
        }
    });

    await prisma.$disconnect();
});

describe('Transactions API', () => {

    test('GET /api/transactions/account/:accountId — порожня історія власного рахунку', async () => {
        const response = await request(app)
            .get(`/api/transactions/account/${accountId}`)
            .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.status).toBe('success');
        expect(response.body.data).toEqual([]);
    });

    test('GET /api/transactions/account/:accountId — доступ без авторизації заборонений', async () => {
        const response = await request(app)
            .get(`/api/transactions/account/${accountId}`);

        expect(response.status).toBe(401);
        expect(response.body.status).toBe('error');
    });

    test('GET /api/transactions/account/:accountId — доступ до чужого рахунку заборонений', async () => {
        const response = await request(app)
            .get(`/api/transactions/account/${secondAccountId}`)
            .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(404);
        expect(response.body.status).toBe('error');
        expect(response.body.message).toBe('Account not found');
    });

    test('GET /api/transactions/account/:accountId — неіснуючий рахунок', async () => {
        const response = await request(app)
            .get('/api/transactions/account/00000000-0000-4000-8000-000000000000')
            .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(404);
        expect(response.body.status).toBe('error');
        expect(response.body.message).toBe('Account not found');
    });

});
