import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/guards';

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

    // GUARD: Only pending requests can be rejected
    if (existingRequest.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Only pending requests can be rejected' },
        { status: 400 },
      );
    }

    const body = await request.json();
    const { rejectedReason } = body;

    if (!rejectedReason || typeof rejectedReason !== 'string' || rejectedReason.trim() === '') {
      return NextResponse.json(
        { error: 'rejectedReason is required and must be a non-empty string' },
        { status: 400 },
      );
    }

    const updated = await prisma.activityRequest.update({
      where: { id: requestId },
      data: {
        status: 'REJECTED',
        rejectedReason: rejectedReason.trim(),
      },
      include: { category: true },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('POST /api/requests/[id]/reject error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
