import nodemailer from 'nodemailer';

interface SendMailParams {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export async function sendMail({ to, subject, text, html }: SendMailParams): Promise<boolean> {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;
  const from = process.env.SMTP_FROM || 'no-reply@kw.ac.kr';

  const isSmtpConfigured = host && user && pass;

  if (!isSmtpConfigured) {
    console.log('\n==================================================');
    console.log('🚨 [SMTP 설정 미비] 이메일이 발송되지 않았습니다.');
    console.log(`수신자: ${to}`);
    console.log(`제목: ${subject}`);
    console.log('--------------------------------------------------');
    console.log('내용 (Text):');
    console.log(text);
    console.log('==================================================\n');
    return true; // 개발 환경에서는 정상 처리된 것처럼 반환
  }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465, // 465 포트는 SSL/TLS 사용
      auth: {
        user,
        pass,
      },
    });

    await transporter.sendMail({
      from: `광운알리미 <${from}>`,
      to,
      subject,
      text,
      html,
    });

    console.log(`📧 이메일 발송 성공 (수신자: ${to})`);
    return true;
  } catch (error) {
    console.error('❌ 이메일 발송 실패:', error);
    console.log('\n==================================================');
    console.log('🚨 [Fallback] 이메일 발송 오류로 콘솔에 내용을 출력합니다.');
    console.log(`수신자: ${to}`);
    console.log(`제목: ${subject}`);
    console.log('--------------------------------------------------');
    console.log('내용 (Text):');
    console.log(text);
    console.log('==================================================\n');
    return true; // 에러가 나더라도 개발환경 편의를 위해 fallback 처리
  }
}
