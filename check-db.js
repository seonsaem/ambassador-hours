const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function check() {
  const users = await prisma.user.findMany();
  console.log('=== Users in DB ===');
  for (const u of users) {
    console.log(`id=${u.id}, email=${u.email}, role=${u.role}, status=${u.status}, hasPassword=${!!u.password}`);
    if (u.password) {
      const testMatch = await bcrypt.compare('admin1234', u.password);
      console.log(`  password 'admin1234' match: ${testMatch}`);
    }
  }
  await prisma.$disconnect();
}

check();
