'use client';

import { useState, useEffect } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

export default function LoginPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      const role = session.user.role;
      if (role === 'ADMIN') {
        router.push('/admin');
      } else {
        router.push('/dashboard');
      }
    }
  }, [status, session, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await signIn('credentials', {
        redirect: false,
        email,
        password,
      });

      if (result?.error) {
        if (result.error.includes('ACCOUNT_BANNED')) {
          setError('계정이 정지되었습니다. 관리자에게 문의하세요.');
        } else if (result.error.includes('ACCOUNT_NOT_ACTIVATED')) {
          setError('계정이 아직 활성화되지 않았습니다. 회원가입을 완료해주세요.');
        } else {
          setError('이메일 또는 비밀번호가 올바르지 않습니다.');
        }
        setLoading(false);
        return;
      }

      // Success - session will update and useEffect will redirect
    } catch {
      setError('로그인 중 오류가 발생했습니다.');
      setLoading(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="auth-page">
        <div className="loading-spinner" />
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <Image src="/logo-gold.png" alt="광운알리미 로고" className="auth-logo" width={400} height={400} priority />
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {error && (
            <div className="alert alert-error" role="alert" aria-live="polite">
              <span className="alert-icon" aria-hidden="true">⚠️</span>
              {error}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email" className="form-label">이메일</label>
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

          <div className="form-group">
            <label htmlFor="password" className="form-label">비밀번호</label>
            <input
              id="password"
              type="password"
              className="form-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-full btn-lg"
            disabled={loading}
          >
            {loading ? (
              <span className="btn-loading">
                <span className="loading-spinner-sm" role="status" aria-live="polite" aria-label="로딩 중" />
                로그인 중…
              </span>
            ) : (
              '로그인'
            )}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            아직 계정이 없으신가요?{' '}
            <Link href="/signup" className="auth-link">
              회원가입
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
