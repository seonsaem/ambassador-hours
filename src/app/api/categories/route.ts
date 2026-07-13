import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth, requireAdmin } from '@/lib/guards';
import { DEPARTMENTS } from '@/lib/constants';

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth();
    if (authResult.error) return authResult.error;

    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('active') === 'true';

    const categories = await prisma.activityCategory.findMany({
      where: activeOnly ? { isActive: true } : {},
      orderBy: { id: 'asc' },
    });

    return NextResponse.json(categories);
  } catch (error) {
    console.error('GET /api/categories error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const adminResult = await requireAdmin();
    if (adminResult.error) return adminResult.error;

    const body = await request.json();
    const { categoryName, activityType, assignedHours, department, maxHours } = body;

    if (!categoryName || !activityType || assignedHours === undefined) {
      return NextResponse.json(
        { error: 'categoryName, activityType, and assignedHours are required' },
        { status: 400 },
      );
    }

    if (!['OFFICIAL', 'AUTONOMOUS'].includes(activityType)) {
      return NextResponse.json(
        { error: 'activityType must be OFFICIAL or AUTONOMOUS' },
        { status: 400 },
      );
    }

    if (department && !(DEPARTMENTS as readonly string[]).includes(department)) {
      return NextResponse.json(
        { error: 'Invalid department' },
        { status: 400 },
      );
    }

    let parsedMaxHours: number | null = null;
    if (Number(assignedHours) === 0 && maxHours !== undefined && maxHours !== null && maxHours !== '') {
      parsedMaxHours = Number(maxHours);
      if (isNaN(parsedMaxHours) || parsedMaxHours <= 0) {
        return NextResponse.json(
          { error: '최대 제한 시간은 0보다 큰 숫자여야 합니다.' },
          { status: 400 },
        );
      }
    }

    const category = await prisma.activityCategory.create({
      data: {
        categoryName,
        activityType,
        assignedHours: Number(assignedHours),
        department: department || null,
        isActive: true,
        maxHours: parsedMaxHours,
      },
    });

    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    console.error('POST /api/categories error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
