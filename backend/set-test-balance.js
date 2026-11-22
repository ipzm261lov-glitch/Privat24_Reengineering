
require('dotenv').config();

const { PrismaClient } = require('./src/generated/prisma');
const { PrismaPg } = require('@prisma/adapter-pg');

const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL
});

const prisma = new PrismaClient({ adapter });

async function main() {
    const account = await prisma.account.update({
        where: {
            id: 'd06800fb-c186-41ef-9525-01b34bffe548'
        },
        data: {
            balance: 16999750
        }
    });

    console.log('Account:', account.accountNumber);
    console.log('New balance:', account.balance.toString());
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
