const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
     log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

// Graceful shutdown
process.on('beforeExit', async () => {
     console.log('[Database] Disconnecting from database...');
     await prisma.$disconnect();
});

module.exports = prisma;
