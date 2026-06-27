import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/guards';

export async function POST(request: NextRequest) {
  try {
    const { error, session } = await requireAuth();
    if (error) return error;

    const body = await request.json();
    const { categoryId, description, userIds, bulkLabel } = body;

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
    const appliedHours = category.assignedHours;

    // Generate bulk label if not provided
    const label = bulkLabel?.trim() || `일괄신청_${new Date().toISOString().slice(0, 10)}`;

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
            createdById: Number(session!.user.id),
          },
        }),
      ),
    );

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
