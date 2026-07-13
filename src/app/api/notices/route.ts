import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/guards';

export async function GET() {
  try {
    const { error } = await requireAuth();
    if (error) return error;

    const notices = await prisma.notice.findMany({
      include: {
        author: { select: { id: true, name: true, email: true } },
      },
      orderBy: [
        { isPinned: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    return NextResponse.json(notices);
  } catch (error) {
    console.error('GET /api/notices error:', error);
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
    const { title, content, isPinned } = body;

    if (!title || typeof title !== 'string' || title.trim().length < 1) {
      return NextResponse.json(
        { error: '제목을 입력해 주세요.' },
        { status: 400 },
      );
    }

    if (!content || typeof content !== 'string' || content.trim().length < 1) {
      return NextResponse.json(
        { error: '내용을 입력해 주세요.' },
        { status: 400 },
      );
    }

    if (title.length > 100) {
      return NextResponse.json(
        { error: '제목은 100자 이내로 입력해 주세요.' },
        { status: 400 },
      );
    }

    if (content.length > 2000) {
      return NextResponse.json(
        { error: '내용은 2000자 이내로 입력해 주세요.' },
        { status: 400 },
      );
    }

    const created = await prisma.notice.create({
      data: {
        title: title.trim(),
        content: content.trim(),
        isPinned: isPinned === true,
        authorId: Number(session.user.id),
      },
      include: {
        author: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error('POST /api/notices error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
