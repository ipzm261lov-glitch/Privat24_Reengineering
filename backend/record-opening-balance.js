require('dotenv').config();
const prisma = require('./src/config/database');

async function main() {
    const accountId = 'd06800fb-c186-41ef-9525-01b34bffe548';
    const expectedBalance = 16999750;

    await prisma.$transaction(async (tx) => {
        const account = await tx.account.findUnique({
            where: { id: accountId }
        });

        if (!account) {
            throw new Error('Account not found');
        }

        if (Number(account.balance) !== expectedBalance) {
            throw new Error('Account balance does not match expected value');
        }

        const existing = await tx.transaction.findFirst({
            where: {
                accountId,
                type: 'CREDIT',
                amount: expectedBalance,
                balanceAfter: expectedBalance
            }
        });

        if (existing) {
            console.log('Opening balance transaction already exists.');
            return;
        }

        const transaction = await tx.transaction.create({
            data: {
                accountId,
                type: 'CREDIT',
                amount: expectedBalance,
                balanceAfter: expectedBalance
            }
        });

        console.log('Opening balance transaction created:', transaction.id);
    });
}

main()
    .catch((error) => {
        console.error('Failed:', error.message);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
