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



  // 3. Define all categories (including original sample categories and newly requested ones)
  const categoriesList = [
    // 기존 공식 활동 카테고리
    { id: 2, categoryName: '홍보 행사 참여', activityType: 'OFFICIAL', assignedHours: 3, department: null },
    { id: 4, categoryName: '캠퍼스 투어 진행', activityType: 'OFFICIAL', assignedHours: 4, department: null },
    
    // 기존 자율 활동 카테고리 (부서 지정)
    { id: 3, categoryName: 'SNS 콘텐츠 제작', activityType: 'AUTONOMOUS', assignedHours: 2, department: '미디어홍보부' },

    // 1. 미디어홍보부 자율 활동
    { id: 5, categoryName: '프로필 촬영 및 보조', activityType: 'AUTONOMOUS', assignedHours: 2, department: '미디어홍보부' },
    { id: 6, categoryName: '프로필 편집', activityType: 'AUTONOMOUS', assignedHours: 4, department: '미디어홍보부' },
    { id: 7, categoryName: '영상 편집 (2분 이내)', activityType: 'AUTONOMOUS', assignedHours: 0.5, department: '미디어홍보부' },
    { id: 8, categoryName: '영상 편집 (2분 이상)', activityType: 'AUTONOMOUS', assignedHours: 1, department: '미디어홍보부' },
    { id: 9, categoryName: '피그마 편집', activityType: 'AUTONOMOUS', assignedHours: 0.5, department: '미디어홍보부' },
    { id: 10, categoryName: '명찰 디자인 편집', activityType: 'AUTONOMOUS', assignedHours: 0.5, department: '미디어홍보부' },
    { id: 11, categoryName: '콘텐츠 촬영 (2분 이내)', activityType: 'AUTONOMOUS', assignedHours: 0.5, department: '미디어홍보부' },
    { id: 12, categoryName: '콘텐츠 촬영 (2분 이상)', activityType: 'AUTONOMOUS', assignedHours: 1, department: '미디어홍보부' },

    // 2. 전공체험부 자율 활동
    { id: 13, categoryName: '전공체험 키트 제작', activityType: 'AUTONOMOUS', assignedHours: 1, department: '전공체험부' },
    { id: 14, categoryName: '전공체험 자료 제작', activityType: 'AUTONOMOUS', assignedHours: 2, department: '전공체험부' },
    { id: 15, categoryName: '전공체험 관련 회의', activityType: 'AUTONOMOUS', assignedHours: 0.5, department: '전공체험부' },
    { id: 16, categoryName: '전공체험 리워크', activityType: 'AUTONOMOUS', assignedHours: 0.5, department: '전공체험부' },
    { id: 17, categoryName: '전공체험 리워크 시연', activityType: 'AUTONOMOUS', assignedHours: 0.5, department: '전공체험부' },
    { id: 18, categoryName: '전공체험 자료 수정', activityType: 'AUTONOMOUS', assignedHours: 0.5, department: '전공체험부' },
    { id: 19, categoryName: '명찰 제작', activityType: 'AUTONOMOUS', assignedHours: 0.5, department: '전공체험부' },

    // 3. 전략기획부 자율 활동
    { id: 20, categoryName: '구매처 및 예약처 선정', activityType: 'AUTONOMOUS', assignedHours: 0.5, department: '전략기획부' },
    { id: 21, categoryName: '구매처 및 예약처 구매 진행', activityType: 'AUTONOMOUS', assignedHours: 0.5, department: '전략기획부' },
    { id: 22, categoryName: '콘텐츠 기획 (콘티 작성 포함)', activityType: 'AUTONOMOUS', assignedHours: 1, department: '전략기획부' },
    { id: 23, categoryName: '시간제 관리', activityType: 'AUTONOMOUS', assignedHours: 5, department: '전략기획부' },

    // 4. 임원진/부장 자율 활동
    { id: 24, categoryName: '부장 및 임원진 활동 (회장 제외)', activityType: 'AUTONOMOUS', assignedHours: 2, department: '임원진/부장' },
    { id: 25, categoryName: '강의실 대여', activityType: 'AUTONOMOUS', assignedHours: 0.5, department: '임원진/부장' },
    { id: 26, categoryName: '회의록 작성', activityType: 'AUTONOMOUS', assignedHours: 0.5, department: '임원진/부장' },
    { id: 27, categoryName: '회비 관리', activityType: 'AUTONOMOUS', assignedHours: 0.5, department: '임원진/부장' },

    // 5. 신입기수 자율 활동
    { id: 28, categoryName: '신입기수 모집 포스터 제작', activityType: 'AUTONOMOUS', assignedHours: 1, department: '신입기수' },
    { id: 29, categoryName: '신입기수 모집 리플렛 제작', activityType: 'AUTONOMOUS', assignedHours: 1.5, department: '신입기수' },
    { id: 30, categoryName: '신입기수 모집 영상 촬영', activityType: 'AUTONOMOUS', assignedHours: 1, department: '신입기수' },
    { id: 31, categoryName: '신입기수 모집 영상 편집', activityType: 'AUTONOMOUS', assignedHours: 4, department: '신입기수' },
    { id: 32, categoryName: '신입기수 모집 영상 기획', activityType: 'AUTONOMOUS', assignedHours: 1, department: '신입기수' },
    { id: 33, categoryName: '수시박람회 카드뉴스 제작', activityType: 'AUTONOMOUS', assignedHours: 2, department: '신입기수' },
    { id: 34, categoryName: '입학전형 카드뉴스 제작', activityType: 'AUTONOMOUS', assignedHours: 2, department: '신입기수' },
    { id: 35, categoryName: '입학전형 블로그 작성', activityType: 'AUTONOMOUS', assignedHours: 2, department: '신입기수' },
    { id: 36, categoryName: '합격수기 작성', activityType: 'AUTONOMOUS', assignedHours: 2, department: '신입기수' },
  ];

  for (const cat of categoriesList) {
    await prisma.activityCategory.upsert({
      where: { id: cat.id },
      update: {
        categoryName: cat.categoryName,
        activityType: cat.activityType,
        assignedHours: cat.assignedHours,
        department: cat.department,
      },
      create: {
        id: cat.id,
        categoryName: cat.categoryName,
        activityType: cat.activityType,
        assignedHours: cat.assignedHours,
        department: cat.department,
        isActive: true,
      },
    });
  }
  console.log('✅ All categories successfully seeded');

  // 4. Update the PostgreSQL sequence for ActivityCategory
  await prisma.$executeRawUnsafe(
    `SELECT setval(pg_get_serial_sequence('"ActivityCategory"', 'id'), COALESCE((SELECT MAX(id) FROM "ActivityCategory"), 1))`
  );
  console.log('✅ ActivityCategory sequence reset');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
