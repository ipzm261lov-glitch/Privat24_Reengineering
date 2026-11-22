
require('dotenv').config();

const request = require('supertest');
const crypto = require('crypto');
const app = require('../src/app');
const prisma = require('../src/config/database');

const testPrefix = `jest_transfer_${Date.now()}`;

let userId;
let secondUserId;
let senderAccountId;
let receiverAccountId;
let foreignAccountId;
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

    // Створюємо рахунок відправника
    const sender = await prisma.account.create({
        data: {
            accountNumber: `UA${Date.now()}${Math.floor(Math.random() * 1000000)
                .toString().padStart(6, '0')}`,
            balance: 1000,
            currency: 'UAH',
            status: 'ACTIVE',
            userId
        }
    });

    senderAccountId = sender.id;

    // Створюємо рахунок отримувача
    const receiver = await prisma.account.create({
        data: {
            accountNumber: `UA${Date.now()}${Math.floor(Math.random() * 1000000)
                .toString().padStart(6, '0')}`,
            balance: 500,
            currency: 'UAH',
            status: 'ACTIVE',
            userId: secondUserId
        }
    });

    receiverAccountId = receiver.id;

    // Створюємо чужий рахунок для перевірки доступу
    const foreignAccount = await prisma.account.create({
        data: {
            accountNumber: `UA${Date.now()}${Math.floor(Math.random() * 1000000)
                .toString().padStart(6, '0')}`,
            balance: 1000,
            currency: 'UAH',
            status: 'ACTIVE',
            userId: secondUserId
        }
    });

    foreignAccountId = foreignAccount.id;

    // Створюємо токен авторизації
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
    const accountIds = [
        senderAccountId,
        receiverAccountId,
        foreignAccountId
    ].filter(Boolean);

    const userIds = [userId, secondUserId].filter(Boolean);

    // Видаляємо тестові сесії
    if (userIds.length > 0) {
        await prisma.session.deleteMany({
            where: { userId: { in: userIds } }
        });
    }

    if (accountIds.length > 0) {
        // Видаляємо записи історії операцій
        await prisma.transaction.deleteMany({
            where: { accountId: { in: accountIds } }
        });

        // Видаляємо тестові перекази
        await prisma.transfer.deleteMany({
            where: {
                OR: [
                    { fromAccountId: { in: accountIds } },
                    { toAccountId: { in: accountIds } }
                ]
            }
        });

        // Видаляємо тестові рахунки
        await prisma.account.deleteMany({
            where: { id: { in: accountIds } }
        });
    }

    // Видаляємо тестових користувачів
    if (userIds.length > 0) {
        await prisma.user.deleteMany({
            where: { id: { in: userIds } }
        });
    }

    await prisma.$disconnect();
});

describe('Transfers API', () => {

    test('POST /api/transfers — успішний переказ коштів', async () => {
        const response = await request(app)
            .post('/api/transfers')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
                fromAccountId: senderAccountId,
                toAccountId: receiverAccountId,
                amount: 100,
                description: 'Jest test transfer'
            });

        expect(response.status).toBe(201);
        expect(response.body.status).toBe('success');
        expect(response.body.data.status).toBe('COMPLETED');

        expect(Number(response.body.data.senderBalance)).toBe(900);
        expect(Number(response.body.data.receiverBalance)).toBe(600);

        // Перевіряємо фактичні баланси в базі даних
        const sender = await prisma.account.findUnique({
            where: { id: senderAccountId }
        });

        const receiver = await prisma.account.findUnique({
            where: { id: receiverAccountId }
        });

        expect(Number(sender.balance)).toBe(900);
        expect(Number(receiver.balance)).toBe(600);

        // Перевіряємо записи історії операцій
        const transactions = await prisma.transaction.findMany({
            where: {
                transferId: response.body.data.id
            }
        });

        expect(transactions).toHaveLength(2);
        expect(transactions.map(item => item.type).sort())
            .toEqual(['CREDIT', 'DEBIT']);
    });

    test('POST /api/transfers — доступ без авторизації заборонений', async () => {
        const response = await request(app)
            .post('/api/transfers')
            .send({
                fromAccountId: senderAccountId,
                toAccountId: receiverAccountId,
                amount: 50
            });

        expect(response.status).toBe(401);
        expect(response.body.status).toBe('error');
    });

    test('POST /api/transfers — неможливо переказати кошти з чужого рахунку', async () => {
        const response = await request(app)
            .post('/api/transfers')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
                fromAccountId: foreignAccountId,
                toAccountId: senderAccountId,
                amount: 100
            });

        expect(response.status).toBe(404);
        expect(response.body.message).toBe('Account not found');

        // Баланс чужого рахунку не повинен змінитися
        const foreignAccount = await prisma.account.findUnique({
            where: { id: foreignAccountId }
        });

        expect(Number(foreignAccount.balance)).toBe(1000);
    });

    test('POST /api/transfers — недостатньо коштів', async () => {
        const response = await request(app)
            .post('/api/transfers')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
                fromAccountId: senderAccountId,
                toAccountId: receiverAccountId,
                amount: 2000
            });

        expect(response.status).toBe(409);
        expect(response.body.message).toBe('Insufficient funds');

        const sender = await prisma.account.findUnique({
            where: { id: senderAccountId }
        });

        expect(Number(sender.balance)).toBe(900);
    });

    test('POST /api/transfers — переказ на той самий рахунок', async () => {
        const response = await request(app)
            .post('/api/transfers')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
                fromAccountId: senderAccountId,
                toAccountId: senderAccountId,
                amount: 50
            });

        expect(response.status).toBe(400);
        expect(response.body.message)
            .toBe('Cannot transfer to the same account');
    });

    test('POST /api/transfers — некоректна сума переказу', async () => {
        const response = await request(app)
            .post('/api/transfers')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
                fromAccountId: senderAccountId,
                toAccountId: receiverAccountId,
                amount: 0
            });

        expect(response.status).toBe(400);
        expect(response.body.message).toBe('Invalid transfer amount');
    });

});
