'use client';

import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';

interface NavItem {
  href: string;
  label: string;
}

const userNavItems: NavItem[] = [
  { href: '/dashboard', label: '대시보드' },
  { href: '/dashboard/new', label: '활동 신청' },
  { href: '/dashboard/bulk', label: '통합 신청' },
];

const adminNavItems: NavItem[] = [
  { href: '/admin', label: '승인 대기열' },
  { href: '/admin/categories', label: '카테고리 설정' },
  { href: '/admin/users', label: '사용자 관리' },
];

export default function Navbar() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const mobileNavRef = useRef<HTMLDivElement>(null);

  // Web Push states
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [pushSupported, setPushSupported] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          setPushSupported(true);
          return reg.pushManager.getSubscription();
        })
        .then((sub) => {
          if (sub) {
            setIsSubscribed(true);
          }
        })
        .catch((err) => {
          console.error('Service worker registration failed:', err);
        });
    }
  }, []);

  const base64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const handlePushToggle = async () => {
    if (!pushSupported) return;

    try {
      const reg = await navigator.serviceWorker.ready;

      if (isSubscribed) {
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          await sub.unsubscribe();
          await fetch('/api/push/subscribe', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ endpoint: sub.endpoint }),
          });
        }
        setIsSubscribed(false);
      } else {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          alert('알림 권한이 거부되었습니다. 브라우저 설정에서 권한을 허용해 주세요.');
          return;
        }

        const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        if (!vapidPublicKey) {
          console.error('VAPID public key is missing');
          return;
        }

        const convertedKey = base64ToUint8Array(vapidPublicKey);
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedKey,
        });

        const res = await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subscription: sub }),
        });

        if (res.ok) {
          setIsSubscribed(true);
        } else {
          console.error('Failed to save push subscription on server');
        }
      }
    } catch (error) {
      console.error('Error toggling push notification:', error);
    }
  };

  const isAdmin = session?.user?.role === 'ADMIN';
  const navItems = isAdmin ? [...userNavItems, ...adminNavItems] : userNavItems;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        mobileNavRef.current &&
        !mobileNavRef.current.contains(e.target as Node) &&
        !(e.target as Element).closest('.hamburger')
      ) {
        setMobileOpen(false);
      }
    }

    if (mobileOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  const handleLogout = async () => {
    await signOut({ redirect: false });
    window.location.href = '/login';
  };

  if (status === 'loading') {
    return (
      <header className="site-navbar">
        <div className="site-navbar-inner">
          <div className="site-navbar-brand">
            <Image src="/logo-navy.png" alt="광운알리미" width={34} height={34} className="site-navbar-logo" />
            <span>광운알리미</span>
          </div>
          <div className="loading-spinner-sm" role="status" aria-label="로딩 중" />
        </div>
      </header>
    );
  }

  if (!session) return null;

  const getUserInitial = (name: string | null | undefined): string => {
    if (!name) return 'U';
    const cohortMatch = name.match(/(\d+)\s*기/);
    if (cohortMatch) return cohortMatch[1];
    const leadingNumberMatch = name.match(/^(\d+)/);
    if (leadingNumberMatch) return leadingNumberMatch[1];
    return name.charAt(0);
  };

  const userInitial = getUserInitial(session.user?.name);

  return (
    <>
      <header className="site-navbar">
        <div className="site-navbar-inner">
          {/* Brand Logo */}
          <Link href="/dashboard" className="site-navbar-brand">
            <Image src="/logo-navy.png" alt="광운알리미" width={34} height={34} className="site-navbar-logo" priority />
            <span>광운알리미</span>
          </Link>

          {/* Desktop nav links */}
          <ul className="nav-links-desktop">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`nav-item-link ${isActive ? 'is-active' : ''}`}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>

          {/* Right section */}
          <div className="site-navbar-right">
            {pushSupported && (
              <button
                onClick={handlePushToggle}
                title={isSubscribed ? '알림 끄기' : '알림 켜기'}
                className={`nav-icon-btn ${isSubscribed ? 'is-active' : ''}`}
              >
                {isSubscribed ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                    <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                    <path d="M18.63 13A17.89 17.89 0 0 1 18 8" />
                    <path d="M6.26 6.26A5.86 5.86 0 0 0 6 8c0 7-3 9-3 9h14" />
                    <path d="M18 8a6 6 0 0 0-9.33-5" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                )}
              </button>
            )}

            {/* User profile chip */}
            <div className="navbar-user-chip">
              <div className="navbar-user-avatar">{userInitial}</div>
              <span className="navbar-user-name">{session.user?.name}</span>
            </div>

            <button onClick={handleLogout} className="btn-logout">
              로그아웃
            </button>

            {/* Hamburger for mobile */}
            <button
              className="hamburger"
              onClick={() => setMobileOpen((prev) => !prev)}
              aria-label="메뉴 열기"
              aria-expanded={mobileOpen}
            >
              <div style={{ width: '16px', height: '12px', position: 'relative' }}>
                <span
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '1.75px',
                    background: 'var(--text-primary)',
                    borderRadius: '1px',
                    transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                    transformOrigin: 'center',
                    transform: mobileOpen ? 'translateY(5.1px) rotate(45deg)' : 'none',
                  }}
                />
                <span
                  style={{
                    position: 'absolute',
                    top: '5.1px',
                    left: 0,
                    width: '100%',
                    height: '1.75px',
                    background: 'var(--text-primary)',
                    borderRadius: '1px',
                    transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                    opacity: mobileOpen ? 0 : 1,
                  }}
                />
                <span
                  style={{
                    position: 'absolute',
                    top: '10.2px',
                    left: 0,
                    width: '100%',
                    height: '1.75px',
                    background: 'var(--text-primary)',
                    borderRadius: '1px',
                    transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                    transformOrigin: 'center',
                    transform: mobileOpen ? 'translateY(-5.1px) rotate(-45deg)' : 'none',
                  }}
                />
              </div>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Drawer */}
      <div
        ref={mobileNavRef}
        className={`mobile-drawer ${mobileOpen ? 'is-open' : ''}`}
      >
        <div
          style={{
            padding: '16px',
            background: 'var(--bg-primary)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            marginBottom: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <div className="navbar-user-avatar" style={{ width: '36px', height: '36px', fontSize: '0.9rem' }}>
            {userInitial}
          </div>
          <div>
            <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', display: 'block', fontWeight: 500 }}>
              로그인된 계정
            </span>
            <strong style={{ fontSize: '1.05rem', color: 'var(--text-primary)', display: 'block' }}>
              {session.user?.name}
            </strong>
          </div>
        </div>

        {pushSupported && (
          <button
            onClick={handlePushToggle}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              borderRadius: 'var(--radius-md)',
              background: isSubscribed ? '#eff6ff' : 'var(--bg-primary)',
              border: isSubscribed ? '1px solid #bfdbfe' : '1px solid var(--border-subtle)',
              color: isSubscribed ? '#1e40af' : 'var(--text-secondary)',
              fontSize: '0.92rem',
              fontWeight: 600,
              cursor: 'pointer',
              width: '100%',
              textAlign: 'left',
              marginBottom: '8px',
            }}
          >
            <span>푸시 알림 수신 설정</span>
            <span style={{ fontSize: '0.84rem', fontWeight: 700 }}>
              {isSubscribed ? '켜짐' : '꺼짐'}
            </span>
          </button>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                style={{
                  display: 'block',
                  padding: '13px 16px',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '1rem',
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? 'var(--primary)' : 'var(--text-secondary)',
                  background: isActive ? 'var(--bg-tertiary)' : 'transparent',
                  textDecoration: 'none',
                }}
              >
                {item.label}
              </Link>
            );
          })}
        </div>

        <button
          onClick={() => {
            setMobileOpen(false);
            handleLogout();
          }}
          className="btn btn-outline-danger btn-full"
          style={{ marginTop: 'auto', padding: '13px' }}
        >
          로그아웃
        </button>
      </div>
    </>
  );
}
