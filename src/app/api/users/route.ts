import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/guards';

export async function GET() {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    // Fetch all users with aggregated approved hours
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
        requests: {
          where: { status: 'APPROVED' },
          select: {
            appliedHours: true,
            activityType: true,
            category: { select: { id: true, categoryName: true } },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Map to include official/autonomous/total hours + category breakdown
    const usersWithHours = users.map((user) => {
      const officialHours = user.requests
        .filter((r) => r.activityType === 'OFFICIAL')
        .reduce((sum, r) => sum + r.appliedHours, 0);
      const autonomousHours = user.requests
        .filter((r) => r.activityType === 'AUTONOMOUS')
        .reduce((sum, r) => sum + r.appliedHours, 0);
      const totalApprovedHours = officialHours + autonomousHours;

      // Group by category
      const catMap: Record<number, { categoryName: string; activityType: string; hours: number; count: number }> = {};
      for (const req of user.requests) {
        const catId = req.category.id;
        if (!catMap[catId]) {
          catMap[catId] = { categoryName: req.category.categoryName, activityType: req.activityType, hours: 0, count: 0 };
        }
        catMap[catId].hours += req.appliedHours;
        catMap[catId].count += 1;
      }
      const categoryBreakdown = Object.entries(catMap).map(([id, data]) => ({
        categoryId: Number(id),
        ...data,
      }));

      const { requests, ...userData } = user;
      return { ...userData, officialHours, autonomousHours, totalApprovedHours, categoryBreakdown };
    });

    return NextResponse.json(usersWithHours);
  } catch (error) {
    console.error('GET /api/users error:', error);
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
    const { name, email } = body;

    if (!name || !email) {
      return NextResponse.json(
        { error: 'name and email are required' },
        { status: 400 },
      );
    }

    // Check if email already exists
    const existing = await prisma.user.findUnique({
      where: { email },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'A user with this email already exists' },
        { status: 409 },
      );
    }

    const user = await prisma.user.create({
      data: {
        name,
        email,
        role: 'USER',
        status: 'INVITED',
      },
    });

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    console.error('POST /api/users error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
