const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
     log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
     datasources: {
          db: {
               url: process.env.MONGO_URI,
          },
     },
});

// Graceful shutdown
process.on('beforeExit', async () => {
     console.log('[Database] Disconnecting from database...');
     await prisma.$disconnect();
});

// Log memory usage every 10 minutes in production to help diagnose leaks
if (process.env.NODE_ENV !== 'development') {
     setInterval(() => {
          const mem = process.memoryUsage();
          const mb = (bytes) => (bytes / 1024 / 1024).toFixed(1);
          console.log(
               `[Memory] RSS: ${mb(mem.rss)}MB | Heap: ${mb(mem.heapUsed)}/${mb(mem.heapTotal)}MB | External: ${mb(mem.external)}MB`
          );
     }, 10 * 60 * 1000);
}

module.exports = prisma;
