'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/reset-password/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '이메일 발송 요청 중 오류가 발생했습니다.');
      }

      setMessage(data.message || '비밀번호 재설정 링크가 이메일로 발송되었습니다.');
      setEmail('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '이메일 발송 요청 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <Image src="/logo-navy.png" alt="광운알리미 로고" className="auth-logo" width={96} height={96} priority />
          <h1 className="auth-title">비밀번호 찾기</h1>
          <p className="auth-subtitle">
            가입한 이메일 주소를 입력하시면 비밀번호 재설정 링크를 보내드립니다.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {error && (
            <div className="alert alert-error" role="alert" aria-live="polite">
              <span className="alert-icon" aria-hidden="true">!</span>
              {error}
            </div>
          )}

          {message && (
            <div className="alert alert-success" role="alert" aria-live="polite">
              <span className="alert-icon" aria-hidden="true">✓</span>
              {message}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email" className="form-label">이메일 주소</label>
            <input
              id="email"
              type="email"
              className="form-input"
              placeholder="example@kw.ac.kr"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-full btn-lg"
            disabled={loading || !!message}
            style={{ marginTop: '8px' }}
          >
            {loading ? (
              <span className="btn-loading">
                <span className="loading-spinner-sm" role="status" aria-live="polite" aria-label="로딩 중" />
                요청 전송 중…
              </span>
            ) : (
              '재설정 링크 발송'
            )}
          </button>
        </form>

        <div className="auth-footer" style={{ marginTop: '24px' }}>
          <p>
            <Link href="/login" className="auth-link">
              로그인 화면으로 돌아가기
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
