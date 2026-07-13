import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/guards';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { error } = await requireAuth();
    if (error) return error;

    const { id } = await params;
    const noticeId = Number(id);
    if (isNaN(noticeId)) {
      return NextResponse.json({ error: 'Invalid notice ID' }, { status: 400 });
    }

    const existing = await prisma.notice.findUnique({
      where: { id: noticeId },
    });

    if (!existing) {
      return NextResponse.json({ error: '공지사항을 찾을 수 없습니다.' }, { status: 404 });
    }

    const body = await request.json();
    const { title, content, isPinned } = body;

    if (!title || typeof title !== 'string' || title.trim().length < 1) {
      return NextResponse.json({ error: '제목을 입력해 주세요.' }, { status: 400 });
    }

    if (!content || typeof content !== 'string' || content.trim().length < 1) {
      return NextResponse.json({ error: '내용을 입력해 주세요.' }, { status: 400 });
    }

    if (title.length > 100) {
      return NextResponse.json({ error: '제목은 100자 이내로 입력해 주세요.' }, { status: 400 });
    }

    if (content.length > 2000) {
      return NextResponse.json({ error: '내용은 2000자 이내로 입력해 주세요.' }, { status: 400 });
    }

    const updated = await prisma.notice.update({
      where: { id: noticeId },
      data: {
        title: title.trim(),
        content: content.trim(),
        isPinned: isPinned === true,
      },
      include: {
        author: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('PUT /api/notices/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { error } = await requireAuth();
    if (error) return error;

    const { id } = await params;
    const noticeId = Number(id);
    if (isNaN(noticeId)) {
      return NextResponse.json({ error: 'Invalid notice ID' }, { status: 400 });
    }

    const existing = await prisma.notice.findUnique({
      where: { id: noticeId },
    });

    if (!existing) {
      return NextResponse.json({ error: '공지사항을 찾을 수 없습니다.' }, { status: 404 });
    }

    await prisma.notice.delete({ where: { id: noticeId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/notices/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
