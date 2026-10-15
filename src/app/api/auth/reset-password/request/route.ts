import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import prisma from '@/lib/prisma';
import { sendMail } from '@/lib/mail';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: '이메일을 입력해주세요.' },
        { status: 400 },
      );
    }

    const trimmedEmail = email.trim().toLowerCase();

    // 1. 사용자 조회
    const user = await prisma.user.findUnique({
      where: { email: trimmedEmail },
    });

    // 보안 모범 사례: 계정 존재 여부를 공격자에게 유출하지 않기 위해,
    // 계정이 존재하지 않더라도 클라이언트에는 "성공(메일 전송)" 메시지를 반환합니다.
    if (!user) {
      console.log(`[비밀번호 재설정 요청] 존재하지 않는 이메일 요청: ${trimmedEmail}`);
      return NextResponse.json({
        message: '비밀번호 재설정 이메일이 발송되었습니다. (가입된 계정인 경우)',
      });
    }

    // 2. 토큰 및 만료일 생성 (1시간 유효)
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    // 3. 사용자 정보에 토큰 저장
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken: token,
        resetTokenExpires: expiresAt,
      },
    });

    // 4. 이메일 발송 준비
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const resetUrl = `${baseUrl}/reset-password?token=${token}`;

    const subject = '[광운알리미] 비밀번호 재설정 요청';
    const text = `안녕하세요, ${user.name}님.\n\n계정의 비밀번호 재설정 요청을 받았습니다. 아래 링크를 클릭하여 새로운 비밀번호를 설정해주세요. 이 링크는 1시간 동안만 유효합니다.\n\n비밀번호 재설정 링크:\n${resetUrl}\n\n만약 본인이 요청하지 않으셨다면 이 이메일을 무시하셔도 됩니다.`;
    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Pretendard Variable', sans-serif; max-width: 560px; margin: 0 auto; padding: 32px; border: 1px solid #E2E6EE; border-radius: 16px; background-color: #FFFFFF; color: #111827;">
        <h2 style="color: #18223C; border-bottom: 1px solid #EEF1F6; padding-bottom: 16px; margin-top: 0; font-size: 20px;">비밀번호 재설정 안내</h2>
        <p style="font-size: 15px; line-height: 1.6; color: #4B5563;">안녕하세요, <strong style="color: #111827;">${user.name}</strong>님.</p>
        <p style="font-size: 15px; line-height: 1.6; color: #4B5563;">광운알리미 계정의 비밀번호 재설정 요청을 받았습니다.<br>아래 버튼을 눌러 새로운 비밀번호를 설정하실 수 있습니다. (1시간 내 유효)</p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${resetUrl}" style="background-color: #18223C; color: #FFFFFF; padding: 14px 28px; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 15px; display: inline-block;">비밀번호 재설정하기</a>
        </div>
        <p style="font-size: 12px; color: #6B7280; word-break: break-all;">위 버튼이 클릭되지 않는 경우, 아래 링크를 주소창에 복사해서 이동해 주세요:<br><a href="${resetUrl}" style="color: #2563EB;">${resetUrl}</a></p>
        <hr style="border: 0; border-top: 1px solid #EEF1F6; margin-top: 28px; margin-bottom: 16px;">
        <p style="font-size: 12px; color: #8B95A5; margin: 0;">본인이 요청하지 않으셨다면 이 이메일을 안전하게 무시하시기 바랍니다.</p>
      </div>
    `;

    // 5. 메일 전송 (실패하더라도 콘솔 로그 Fallback이 내장되어 있어 true 반환)
    await sendMail({ to: trimmedEmail, subject, text, html });

    return NextResponse.json({
      message: '비밀번호 재설정 이메일이 발송되었습니다. (가입된 계정인 경우)',
    });
  } catch (error) {
    console.error('비밀번호 재설정 요청 처리 오류:', error);
    return NextResponse.json(
      { error: '서버 처리 중 오류가 발생했습니다.' },
      { status: 500 },
    );
  }
}
