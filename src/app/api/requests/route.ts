import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/guards';

export async function GET() {
  try {
    const { error, session } = await requireAuth();
    if (error) return error;

    const isAdmin = session!.user.role === 'ADMIN';

    const requests = await prisma.activityRequest.findMany({
      where: isAdmin ? {} : { userId: Number(session!.user.id) },
      include: {
        category: true,
        ...(isAdmin ? { user: { select: { id: true, name: true, email: true } } } : {}),
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
    const { error, session } = await requireAuth();
    if (error) return error;

    const body = await request.json();
    const { categoryId, description, evidenceFileUrl } = body;

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

    if (typeof description !== 'string' || description.trim().length < 10) {
      return NextResponse.json(
        { error: 'Description must be at least 10 characters long' },
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

    // GUARD: Block inactive categories
    if (!category.isActive) {
      return NextResponse.json(
        { error: '비활성 카테고리에는 신청할 수 없습니다.' },
        { status: 400 },
      );
    }

    // Determine activityType and appliedHours
    let activityType: string;
    let appliedHours: number;

    if (category.categoryName === '기타') {
      // ETC category: leave blank for admin to fill in during approval
      activityType = '';
      appliedHours = 0;
    } else {
      // Snapshot from category
      activityType = category.activityType;
      appliedHours = category.assignedHours;
    }

    const created = await prisma.activityRequest.create({
      data: {
        userId: Number(session!.user.id),
        categoryId,
        activityType,
        appliedHours,
        description,
        evidenceFileUrl: evidenceFileUrl || null,
        status: 'PENDING',
      },
      include: { category: true },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error('POST /api/requests error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
