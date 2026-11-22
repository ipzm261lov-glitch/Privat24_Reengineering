
require('dotenv').config();

const request = require('supertest');
const app = require('../src/app');
const prisma = require('../src/config/database');
const bcrypt = require('bcryptjs');

const testPrefix = `jest_account_${Date.now()}`;
const testUsername = `${testPrefix}_user`;
const secondUsername = `${testPrefix}_second`;

let userId;
let secondUserId;
let accountId;
let secondAccountId;
let authToken;

beforeAll(async () => {
    const passwordHash = await bcrypt.hash('TestPass123', 12);

    const user = await prisma.user.create({
        data: {
            username: testUsername,
            passwordHash
        }
    });

    userId = user.id;

    const secondUser = await prisma.user.create({
        data: {
            username: secondUsername,
            passwordHash
        }
    });

    secondUserId = secondUser.id;

    const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
            username: testUsername,
            password: 'TestPass123'
        });

    authToken = loginResponse.body.data.token;

    const secondAccount = await prisma.account.create({
        data: {
            accountNumber: `UA${Date.now()}${Math.floor(Math.random() * 1000000)
                .toString()
                .padStart(6, '0')}`,
            balance: 0,
            currency: 'UAH',
            status: 'ACTIVE',
            userId: secondUserId
        }
    });

    secondAccountId = secondAccount.id;
});

afterAll(async () => {
    await prisma.account.deleteMany({
        where: {
            userId: {
                in: [userId, secondUserId]
            }
        }
    });

    await prisma.user.deleteMany({
        where: {
            id: {
                in: [userId, secondUserId]
            }
        }
    });

    await prisma.$disconnect();
});

describe('Accounts API', () => {

    test('POST /api/accounts — створення рахунку', async () => {
        const response = await request(app)
            .post('/api/accounts')
            .set('Authorization', `Bearer ${authToken}`)
            .send({});

        expect(response.status).toBe(201);
        expect(response.body.status).toBe('success');
        expect(response.body.data.userId).toBeUndefined();
        expect(response.body.data.accountNumber).toBeDefined();
        expect(response.body.data.balance).toBe('0');
        expect(response.body.data.currency).toBe('UAH');
        expect(response.body.data.status).toBe('ACTIVE');

        accountId = response.body.data.id;

        const savedAccount = await prisma.account.findUnique({
            where: { id: accountId }
        });

        expect(savedAccount.userId).toBe(userId);
    });

    test('POST /api/accounts — неможливо створити рахунок для іншого користувача', async () => {
        const response = await request(app)
            .post('/api/accounts')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
                userId: secondUserId
            });

        expect(response.status).toBe(201);

        const savedAccount = await prisma.account.findUnique({
            where: { id: response.body.data.id }
        });

        expect(savedAccount.userId).toBe(userId);
        expect(savedAccount.userId).not.toBe(secondUserId);
    });

    test('POST /api/accounts — без токена авторизації', async () => {
        const response = await request(app)
            .post('/api/accounts')
            .send({});

        expect(response.status).toBe(401);
        expect(response.body.status).toBe('error');
    });

    test('GET /api/accounts/:id — отримання власного рахунку', async () => {
        const response = await request(app)
            .get(`/api/accounts/${accountId}`)
            .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.status).toBe('success');
        expect(response.body.data.id).toBe(accountId);
        expect(response.body.data.balance).toBe('0');
        expect(response.body.data.currency).toBe('UAH');
    });

    test('GET /api/accounts/:id — неможливо отримати чужий рахунок', async () => {
        const response = await request(app)
            .get(`/api/accounts/${secondAccountId}`)
            .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(404);
        expect(response.body.message).toBe('Account not found');
    });

    test('GET /api/accounts/:id — неіснуючий рахунок', async () => {
        const response = await request(app)
            .get('/api/accounts/00000000-0000-4000-8000-000000000000')
            .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(404);
        expect(response.body.message).toBe('Account not found');
    });

    test('GET /api/accounts/user — список власних рахунків', async () => {
        const response = await request(app)
            .get('/api/accounts/user')
            .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.status).toBe('success');
        expect(response.body.data).toHaveLength(2);

        const accountIds = response.body.data.map(account => account.id);

        expect(accountIds).toContain(accountId);
        expect(accountIds).not.toContain(secondAccountId);
    });

    test('PATCH /api/accounts/:id/status — блокування власного рахунку', async () => {
        await prisma.account.update({
            where: { id: accountId },
            data: { status: 'ACTIVE' }
        });

        const response = await request(app)
            .patch(`/api/accounts/${accountId}/status`)
            .set('Authorization', `Bearer ${authToken}`)
            .send({ status: 'BLOCKED' });

        expect(response.status).toBe(200);
        expect(response.body.status).toBe('success');
        expect(response.body.data.status).toBe('BLOCKED');
    });

    test('PATCH /api/accounts/:id/status — неможливо змінити статус чужого рахунку', async () => {
        const response = await request(app)
            .patch(`/api/accounts/${secondAccountId}/status`)
            .set('Authorization', `Bearer ${authToken}`)
            .send({ status: 'BLOCKED' });

        expect(response.status).toBe(404);
        expect(response.body.message).toBe('Account not found');

        const secondAccount = await prisma.account.findUnique({
            where: { id: secondAccountId }
        });

        expect(secondAccount.status).toBe('ACTIVE');
    });

    test('PATCH /api/accounts/:id/status — недопустимий статус', async () => {
        const response = await request(app)
            .patch(`/api/accounts/${accountId}/status`)
            .set('Authorization', `Bearer ${authToken}`)
            .send({ status: 'UNKNOWN' });

        expect(response.status).toBe(400);
        expect(response.body.status).toBe('error');
        expect(response.body.message).toBe('Invalid account status');
    });

    test('PATCH /api/accounts/:id/status — заборонений перехід', async () => {
        await prisma.account.update({
            where: { id: accountId },
            data: { status: 'ACTIVE' }
        });

        const response = await request(app)
            .patch(`/api/accounts/${accountId}/status`)
            .set('Authorization', `Bearer ${authToken}`)
            .send({ status: 'ACTIVE' });

        expect(response.status).toBe(409);
        expect(response.body.status).toBe('error');
        expect(response.body.message).toBe('Invalid account status transition');
    });

});
