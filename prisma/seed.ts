import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // 1. Create default ADMIN user
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin1234';
  if (!process.env.ADMIN_PASSWORD) {
    console.warn('⚠️ WARNING: ADMIN_PASSWORD environment variable is not set. Using default "admin1234".');
  }
  const hashedPassword = await bcrypt.hash(adminPassword, 10);
  await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      name: '관리자',
      email: 'admin@example.com',
      password: hashedPassword,
      role: 'ADMIN',
      status: 'ACTIVE',
    },
  });
  console.log('✅ Admin user created');

  // 2. Create ETC category (will be id=1 on fresh DB)
  await prisma.activityCategory.upsert({
    where: { id: 1 },
    update: {},
    create: {
      categoryName: '기타',
      activityType: 'AUTONOMOUS',
      assignedHours: 0,
      isActive: true,
    },
  });
  console.log('✅ ETC category created');

  // 3. Create sample categories
  const sampleCategories = [
    { id: 2, categoryName: '홍보 행사 참여', activityType: 'OFFICIAL', assignedHours: 3 },
    { id: 3, categoryName: 'SNS 콘텐츠 제작', activityType: 'AUTONOMOUS', assignedHours: 2 },
    { id: 4, categoryName: '캠퍼스 투어 진행', activityType: 'OFFICIAL', assignedHours: 4 },
  ];

  for (const cat of sampleCategories) {
    await prisma.activityCategory.upsert({
      where: { id: cat.id },
      update: {},
      create: {
        categoryName: cat.categoryName,
        activityType: cat.activityType,
        assignedHours: cat.assignedHours,
        isActive: true,
      },
    });
  }
  console.log('✅ Sample categories created');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
