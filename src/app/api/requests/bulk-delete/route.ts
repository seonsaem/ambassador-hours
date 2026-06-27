import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/guards';

export async function DELETE() {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    const result = await prisma.activityRequest.deleteMany({});

    return NextResponse.json({
      message: '모든 활동 기록이 삭제되었습니다.',
      deletedCount: result.count,
    });
  } catch (error) {
    console.error('DELETE /api/requests/bulk-delete error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
