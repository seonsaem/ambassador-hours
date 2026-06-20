import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth, requireAdmin } from '@/lib/guards';

export async function GET(request: NextRequest) {
  try {
    const { error } = await requireAuth();
    if (error) return error;

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
    const { error } = await requireAdmin();
    if (error) return error;

    const body = await request.json();
    const { categoryName, activityType, assignedHours } = body;

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

    const category = await prisma.activityCategory.create({
      data: {
        categoryName,
        activityType,
        assignedHours: Number(assignedHours),
        isActive: true,
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
