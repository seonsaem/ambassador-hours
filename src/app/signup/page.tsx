'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== passwordConfirm) {
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }

    if (password.length < 8) {
      setError('비밀번호는 8자 이상이어야 합니다.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 404) {
          setError('초대받지 않은 이메일입니다.');
        } else if (res.status === 409) {
          setError('이미 가입된 이메일입니다.');
        } else {
          setError(data.error || '회원가입 중 오류가 발생했습니다.');
        }
        setLoading(false);
        return;
      }

      // Success - redirect to login
      router.push('/login?registered=true');
    } catch {
      setError('회원가입 중 오류가 발생했습니다.');
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className={`glass-card auth-card ${mounted ? 'auth-card-mounted' : ''}`}>
        <div className="auth-header">
          <h1 className="auth-title gradient-text">회원가입</h1>
          <p className="auth-subtitle">초대받은 이메일로 가입하세요</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {error && (
            <div className="alert alert-error">
              <span className="alert-icon">⚠️</span>
              {error}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email" className="form-label">이메일</label>
            <input
              id="email"
              type="email"
              className="form-input"
              placeholder="초대받은 이메일 주소"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="name" className="form-label">이름</label>
            <input
              id="name"
              type="text"
              className="form-input"
              placeholder="이름을 입력하세요"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoComplete="name"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password" className="form-label">비밀번호</label>
            <input
              id="password"
              type="password"
              className="form-input"
              placeholder="8자 이상 입력하세요"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="passwordConfirm" className="form-label">비밀번호 확인</label>
            <input
              id="passwordConfirm"
              type="password"
              className="form-input"
              placeholder="비밀번호를 다시 입력하세요"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              disabled={loading}
            />
            {passwordConfirm && password !== passwordConfirm && (
              <span className="form-hint form-hint-error">비밀번호가 일치하지 않습니다</span>
            )}
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-full"
            disabled={loading || (!!passwordConfirm && password !== passwordConfirm)}
          >
            {loading ? (
              <span className="btn-loading">
                <span className="loading-spinner-sm" />
                가입 중...
              </span>
            ) : (
              '가입하기'
            )}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            이미 계정이 있으신가요?{' '}
            <Link href="/login" className="auth-link">
              로그인
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
