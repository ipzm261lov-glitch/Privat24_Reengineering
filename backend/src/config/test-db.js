
require('dotenv').config();

const prisma = require('./database');

async function testConnection() {
    try {
        const result = await prisma.$queryRaw`SELECT 1`;

        console.log('PostgreSQL connection successful!');
        console.log('Query result:', result);
    } catch (error) {
        console.error('Database connection failed:', error);
        process.exitCode = 1;
    } finally {
        await prisma.$disconnect();
    }
}

testConnection();
