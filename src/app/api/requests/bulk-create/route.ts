import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/guards';

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth();
    if (authResult.error) return authResult.error;
    const { session } = authResult;

    const body = await request.json();
    const { categoryId, description, userIds, bulkLabel, evidenceFileUrl, activityDate } = body;

    // Validate required fields
    if (!categoryId || !description || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json(
        { error: 'categoryId, description, userIds are required' },
        { status: 400 },
      );
    }

    if (typeof description !== 'string' || description.trim().length < 5) {
      return NextResponse.json(
        { error: '설명은 5자 이상이어야 합니다.' },
        { status: 400 },
      );
    }

    // Fetch category
    const category = await prisma.activityCategory.findUnique({
      where: { id: categoryId },
    });

    if (!category) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 },
      );
    }

    if (!category.isActive) {
      return NextResponse.json(
        { error: '비활성 카테고리에는 신청할 수 없습니다.' },
        { status: 400 },
      );
    }

    // Verify all userIds exist and are ACTIVE
    const users = await prisma.user.findMany({
      where: {
        id: { in: userIds },
        status: 'ACTIVE',
      },
      select: { id: true },
    });

    const validUserIds = users.map((u) => u.id);

    if (validUserIds.length === 0) {
      return NextResponse.json(
        { error: '유효한 사용자가 없습니다.' },
        { status: 400 },
      );
    }

    // Determine activity type and hours from category
    const activityType = category.activityType;
    let appliedHours = category.assignedHours;

    if (category.assignedHours === 0) {
      const { appliedHours: reqAppliedHours } = body;
      if (reqAppliedHours === undefined || typeof reqAppliedHours !== 'number' || reqAppliedHours <= 0) {
        return NextResponse.json(
          { error: '가변 시간 카테고리는 시간 입력이 필요합니다.' },
          { status: 400 },
        );
      }
      if (category.maxHours !== null && reqAppliedHours > category.maxHours) {
        return NextResponse.json(
          { error: `신청 시간이 최대 제한 시간(${category.maxHours}시간)을 초과했습니다.` },
          { status: 400 },
        );
      }
      appliedHours = reqAppliedHours;
    }

    // Generate unique bulk label if not provided
    const label = bulkLabel?.trim() || `일괄신청_${new Date().toISOString().slice(0, 10)}_${Date.now().toString(36)}`;

    // Create all requests in a transaction (status: PENDING for approval queue)
    const created = await prisma.$transaction(
      validUserIds.map((userId) =>
        prisma.activityRequest.create({
          data: {
            userId,
            categoryId,
            activityType,
            appliedHours,
            description: description.trim(),
            status: 'PENDING',
            bulkLabel: label,
            evidenceFileUrl: evidenceFileUrl || null,
            activityDate: activityDate ? new Date(activityDate) : new Date(),
            createdById: Number(session.user.id),
          },
        }),
      ),
    );

    // Notify administrators about the new bulk request
    try {
      const admins = await prisma.user.findMany({
        where: { role: 'ADMIN' },
        select: { id: true },
      });
      const applicantName = session.user.name || '홍보대사';
      const { sendPushNotification } = await import('@/lib/push');
      const pushPromises = admins.map((admin) =>
        sendPushNotification(admin.id, {
          title: '[통합 활동 신청]',
          body: `${applicantName}님이 '${category.categoryName}' (${created.length}명) 통합 신청을 제출했습니다.`,
          url: '/admin',
        })
      );
      Promise.all(pushPromises).catch((err) =>
        console.error('[WebPush] Error pushing bulk request to admins:', err)
      );
    } catch (pushErr) {
      console.error('[WebPush] Bulk notice trigger failed:', pushErr);
    }

    return NextResponse.json(
      {
        createdCount: created.length,
        bulkLabel: label,
        skippedCount: userIds.length - validUserIds.length,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('POST /api/requests/bulk-create error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
