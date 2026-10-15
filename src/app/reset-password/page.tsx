'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [passwordVerification, setPasswordVerification] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  if (!token) {
    return (
      <div className="auth-card">
        <div className="auth-header">
          <Image src="/logo-navy.png" alt="광운알리미 로고" className="auth-logo" width={96} height={96} priority />
          <h1 className="auth-title" style={{ color: 'var(--danger)' }}>
            잘못된 접근입니다
          </h1>
          <p className="auth-subtitle">
            비밀번호 재설정 토큰이 유실되었거나 올바르지 않습니다. 다시 메일의 링크를 통해 접근해 주세요.
          </p>
        </div>
        <div className="auth-footer">
          <p>
            <Link href="/login" className="auth-link">
              로그인 화면으로 이동
            </Link>
          </p>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (password.length < 8) {
      setError('비밀번호는 최소 8자 이상이어야 합니다.');
      return;
    }

    if (password !== passwordVerification) {
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '비밀번호 재설정 중 오류가 발생했습니다.');
      }

      setMessage('비밀번호가 성공적으로 변경되었습니다. 3초 후 로그인 화면으로 이동합니다.');
      setTimeout(() => {
        router.push('/login');
      }, 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '비밀번호 재설정 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-card">
      <div className="auth-header">
        <Image src="/logo-navy.png" alt="광운알리미 로고" className="auth-logo" width={96} height={96} priority />
        <h1 className="auth-title">새 비밀번호 설정</h1>
        <p className="auth-subtitle">
          사용하실 새로운 비밀번호를 입력해 주세요.
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
          <label htmlFor="password" className="form-label">새 비밀번호</label>
          <input
            id="password"
            type="password"
            className="form-input"
            placeholder="최소 8자 이상"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="new-password"
            disabled={loading || !!message}
          />
        </div>

        <div className="form-group">
          <label htmlFor="passwordVerification" className="form-label">새 비밀번호 확인</label>
          <input
            id="passwordVerification"
            type="password"
            className="form-input"
            placeholder="비밀번호 다시 입력"
            value={passwordVerification}
            onChange={(e) => setPasswordVerification(e.target.value)}
            required
            autoComplete="new-password"
            disabled={loading || !!message}
          />
          {passwordVerification && password !== passwordVerification && (
            <div className="form-feedback-invalid" style={{ color: 'var(--danger-light)', fontSize: '0.75rem', marginTop: '4px' }}>
              비밀번호가 일치하지 않습니다.
            </div>
          )}
        </div>

        <button
          type="submit"
          className="btn btn-primary btn-full btn-lg"
          disabled={loading || !!message || !password || password !== passwordVerification}
          style={{ marginTop: '8px' }}
        >
          {loading ? (
            <span className="btn-loading">
              <span className="loading-spinner-sm" role="status" aria-live="polite" aria-label="로딩 중" />
              비밀번호 변경 중…
            </span>
          ) : (
            '비밀번호 변경 완료'
          )}
        </button>
      </form>

      <div className="auth-footer" style={{ marginTop: '24px' }}>
        <p>
          <Link href="/login" className="auth-link">
            로그인 화면으로 가기
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="auth-page">
      <Suspense fallback={
        <div className="auth-card">
          <div className="auth-header">
            <div className="loading-spinner" style={{ margin: '40px auto' }} />
            <p style={{ color: 'var(--text-muted)' }}>페이지 로딩 중…</p>
          </div>
        </div>
      }>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
