'use client';

import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';

interface NavItem {
  href: string;
  label: string;
}

const userNavItems: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/dashboard/new', label: '활동 신청' },
];

const adminNavItems: NavItem[] = [
  { href: '/admin', label: '대기열' },
  { href: '/admin/categories', label: '카테고리' },
  { href: '/admin/users', label: '사용자' },
];

export default function Navbar() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const mobileNavRef = useRef<HTMLDivElement>(null);

  const isAdmin = session?.user?.role === 'ADMIN';
  const navItems = isAdmin ? [...userNavItems, ...adminNavItems] : userNavItems;

  // Close mobile nav when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        mobileNavRef.current &&
        !mobileNavRef.current.contains(e.target as Node)
      ) {
        setMobileOpen(false);
      }
    }

    if (mobileOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      // Prevent body scroll when mobile menu is open
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
    await signOut({ callbackUrl: '/login' });
  };

  if (status === 'loading') {
    return (
      <nav className="navbar">
        <span className="navbar-brand">
          <img src="/logo-gold.png" alt="광운알리미 로고" className="navbar-logo" width="28" height="28" />
          광운알리미
        </span>
        <div style={{ width: 22, height: 22 }} className="loading-spinner" role="status" aria-live="polite" aria-label="로딩 중" />
      </nav>
    );
  }

  if (!session) return null;

  return (
    <>
      <nav className="navbar">
        {/* Brand with logo mark */}
        <Link href="/dashboard" className="navbar-brand">
          <img src="/logo-gold.png" alt="광운알리미 로고" className="navbar-logo" width="28" height="28" />
          광운알리미
        </Link>

        {/* Desktop nav links */}
        <ul className="nav-links">
          {navItems.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`nav-link${pathname === item.href ? ' active' : ''}`}
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>

        {/* Right section */}
        <div className="navbar-right">
          <span className="navbar-user">
            <strong>{session.user?.name}</strong>
          </span>
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
            <span
              style={
                mobileOpen
                  ? { transform: 'rotate(45deg) translate(4px, 4px)' }
                  : undefined
              }
            />
            <span style={mobileOpen ? { opacity: 0 } : undefined} />
            <span
              style={
                mobileOpen
                  ? { transform: 'rotate(-45deg) translate(4px, -4px)' }
                  : undefined
              }
            />
          </button>
        </div>
      </nav>

      {/* Mobile nav - full-screen glass overlay */}
      <div
        ref={mobileNavRef}
        className={`mobile-nav${mobileOpen ? ' open' : ''}`}
      >
        <div className="mobile-nav-user" style={{ padding: 'var(--space-md) var(--space-md) var(--space-sm) var(--space-md)', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', marginBottom: 'var(--space-md)', animation: 'mobileLinkReveal 0.4s var(--ease-out-expo) both' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>로그인된 사용자</span>
          <strong style={{ fontSize: '1.25rem', color: 'var(--text-primary)', display: 'block', marginTop: '4px' }}>{session.user?.name}</strong>
        </div>
        {navItems.map((item, idx) => (
          <Link
            key={item.href}
            href={item.href}
            className={`nav-link${pathname === item.href ? ' active' : ''}`}
            onClick={() => setMobileOpen(false)}
            style={{ animationDelay: `${(idx + 1) * 0.06}s` }}
          >
            {item.label}
          </Link>
        ))}
        <button
          onClick={() => { setMobileOpen(false); handleLogout(); }}
          className="btn btn-outline"
          style={{
            margin: 'var(--space-xl) var(--space-md) 0 var(--space-md)',
            borderColor: 'rgba(239, 68, 68, 0.3)',
            color: '#ef4444',
            animation: 'mobileLinkReveal 0.5s var(--ease-out-expo) both',
            animationDelay: `${(navItems.length + 1) * 0.06}s`
          }}
        >
          로그아웃
        </button>
      </div>
    </>
  );
}
