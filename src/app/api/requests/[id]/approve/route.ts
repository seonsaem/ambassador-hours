import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/guards';
import { Prisma } from '@prisma/client';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    const { id } = await params;
    const requestId = Number(id);

    if (isNaN(requestId)) {
      return NextResponse.json(
        { error: 'Invalid ID format' },
        { status: 400 },
      );
    }

    const existingRequest = await prisma.activityRequest.findUnique({
      where: { id: requestId },
    });

    if (!existingRequest) {
      return NextResponse.json(
        { error: 'Request not found' },
        { status: 404 },
      );
    }

    // GUARD: Only pending requests can be approved
    if (existingRequest.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Only pending requests can be approved' },
        { status: 400 },
      );
    }

    const updateData: Prisma.ActivityRequestUpdateInput = {
      status: 'APPROVED',
    };

    // If ETC category, admin must provide activityType and appliedHours
    const category = await prisma.activityCategory.findUnique({
      where: { id: existingRequest.categoryId },
    });

    if (category?.categoryName === '기타') {
      const body = await request.json();
      const { activityType, appliedHours } = body;

      if (!activityType || !appliedHours) {
        return NextResponse.json(
          {
            error:
              'ETC category requires activityType and appliedHours from admin',
          },
          { status: 400 },
        );
      }

      if (!['OFFICIAL', 'AUTONOMOUS'].includes(activityType)) {
        return NextResponse.json(
          { error: 'activityType must be OFFICIAL or AUTONOMOUS' },
          { status: 400 },
        );
      }

      if (typeof appliedHours !== 'number' || appliedHours <= 0) {
        return NextResponse.json(
          { error: 'appliedHours must be a positive number' },
          { status: 400 },
        );
      }

      updateData.activityType = activityType;
      updateData.appliedHours = appliedHours;
    }

    const updated = await prisma.activityRequest.update({
      where: { id: requestId },
      data: updateData,
      include: { category: true },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('POST /api/requests/[id]/approve error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
