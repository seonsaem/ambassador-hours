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
  { href: '/admin/categories', label: '카테고리 관리' },
  { href: '/admin/users', label: '사용자 관리' },
];

export default function Navbar() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const mobileNavRef = useRef<HTMLDivElement>(null);

  const isAdmin = session?.user?.role === 'ADMIN';
  const navItems = isAdmin ? [...userNavItems, ...adminNavItems] : userNavItems;

  // Close mobile nav on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

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
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [mobileOpen]);

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/login' });
  };

  if (status === 'loading') {
    return (
      <nav className="navbar">
        <span className="navbar-brand">광운알리미 시간관리</span>
        <div style={{ width: 24, height: 24 }} className="loading-spinner" />
      </nav>
    );
  }

  if (!session) return null;

  return (
    <>
      <nav className="navbar">
        {/* Brand */}
        <Link href="/dashboard" className="navbar-brand">
          광운알리미 시간관리
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

      {/* Mobile nav dropdown */}
      <div
        ref={mobileNavRef}
        className={`mobile-nav${mobileOpen ? ' open' : ''}`}
      >
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`nav-link${pathname === item.href ? ' active' : ''}`}
          >
            {item.label}
          </Link>
        ))}
      </div>
    </>
  );
}
