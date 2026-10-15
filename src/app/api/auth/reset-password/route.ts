import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import prisma from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, password } = body;

    // 1. 필수 값 검증
    if (!token || typeof token !== 'string') {
      return NextResponse.json(
        { error: '유효하지 않은 요청입니다. (토큰 유실)' },
        { status: 400 },
      );
    }

    if (!password || typeof password !== 'string') {
      return NextResponse.json(
        { error: '새로운 비밀번호를 입력해주세요.' },
        { status: 400 },
      );
    }

    // 2. 비밀번호 유효성 검사 (8자 이상)
    if (password.length < 8) {
      return NextResponse.json(
        { error: '비밀번호는 최소 8자 이상이어야 합니다.' },
        { status: 400 },
      );
    }

    // 3. 토큰 검증 및 사용자 조회 (만료되지 않은 토큰)
    const user = await prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpires: {
          gt: new Date(),
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: '유효하지 않거나 만료된 비밀번호 재설정 토큰입니다. 다시 시도해 주세요.' },
        { status: 400 },
      );
    }

    // 4. 새로운 비밀번호 해싱
    const hashedPassword = await bcrypt.hash(password, 10);

    // 5. 데이터베이스 업데이트 (비밀번호 변경 및 토큰 파기)
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpires: null,
      },
    });

    console.log(`[비밀번호 재설정 성공] 사용자 ID: ${user.id}, 이메일: ${user.email}`);

    return NextResponse.json({
      message: '비밀번호가 성공적으로 재설정되었습니다.',
    });
  } catch (error) {
    console.error('비밀번호 재설정 처리 오류:', error);
    return NextResponse.json(
      { error: '서버 처리 중 오류가 발생했습니다.' },
      { status: 500 },
    );
  }
}
