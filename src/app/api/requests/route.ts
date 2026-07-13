import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/guards';

export async function GET() {
  try {
    const authResult = await requireAuth();
    if (authResult.error) return authResult.error;
    const { session, dbUser } = authResult;

    const isAdmin = dbUser.role === 'ADMIN';

    const requests = await prisma.activityRequest.findMany({
      where: isAdmin
        ? {}
        : {
            OR: [
              { userId: Number(session.user.id) },
              { createdById: Number(session.user.id) },
            ],
          },
      include: {
        category: true,
        user: { select: { id: true, name: true, email: true } },
        createdBy: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(requests);
  } catch (error) {
    console.error('GET /api/requests error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth();
    if (authResult.error) return authResult.error;
    const { session } = authResult;

    const body = await request.json();
    const { categoryId, description, evidenceFileUrl, bulkLabel, activityDate } = body;

    if (!categoryId || !description) {
      return NextResponse.json(
        { error: 'categoryId and description are required' },
        { status: 400 },
      );
    }

    if (typeof categoryId !== 'number' || isNaN(categoryId)) {
      return NextResponse.json(
        { error: 'Invalid categoryId format' },
        { status: 400 },
      );
    }

    if (typeof description !== 'string' || description.trim().length < 5 || description.length > 2000) {
      return NextResponse.json(
        { error: 'Description must be between 5 and 2000 characters long' },
        { status: 400 },
      );
    }

    if (evidenceFileUrl) {
      const isValidUrl = /^\/api\/files\/[a-f0-9-]{36}$/.test(evidenceFileUrl);
      if (!isValidUrl) {
        return NextResponse.json(
          { error: 'Invalid evidence file URL format' },
          { status: 400 },
        );
      }
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

    // GUARD: Block inactive categories
    if (!category.isActive) {
      return NextResponse.json(
        { error: '비활성 카테고리에는 신청할 수 없습니다.' },
        { status: 400 },
      );
    }

    // Determine activityType and appliedHours
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

    const created = await prisma.activityRequest.create({
      data: {
        userId: Number(session.user.id),
        categoryId,
        activityType,
        appliedHours,
        description,
        evidenceFileUrl: evidenceFileUrl || null,
        status: 'PENDING',
        bulkLabel: bulkLabel?.trim() || null,
        activityDate: activityDate ? new Date(activityDate) : new Date(),
        createdById: Number(session.user.id),
      },
      include: { category: true },
    });

    // Notify all administrators about the new request
    try {
      const admins = await prisma.user.findMany({
        where: { role: 'ADMIN' },
        select: { id: true },
      });
      const applicantName = session.user.name || '홍보대사';
      const categoryName = created.category?.categoryName || '활동';

      const { sendPushNotification } = await import('@/lib/push');
      const pushPromises = admins.map((admin) =>
        sendPushNotification(admin.id, {
          title: '[홍보대사 활동 신청]',
          body: `${applicantName}님이 '${categoryName}' 신청을 제출했습니다.`,
          url: '/admin',
        })
      );
      // Execute pushes asynchronously to avoid blocking the API response
      Promise.all(pushPromises).catch((err) =>
        console.error('[WebPush] Error pushing to admins:', err)
      );
    } catch (pushErr) {
      console.error('[WebPush] Notice trigger failed:', pushErr);
    }

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error('POST /api/requests error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
