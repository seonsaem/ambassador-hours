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

  const isAdmin = session?.user?.role === 'ADMIN';
  const navItems = isAdmin ? [...userNavItems, ...adminNavItems] : userNavItems;

  // Close mobile nav when clicking outside
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
    await signOut({ callbackUrl: '/login' });
  };

  if (status === 'loading') {
    return (
      <div 
        style={{
          position: 'fixed',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '90%',
          maxWidth: '1200px',
          height: '60px',
          background: 'rgba(10, 16, 30, 0.6)',
          backdropFilter: 'blur(16px)',
          borderRadius: '9999px',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}
      >
        <div style={{ width: 20, height: 20 }} className="loading-spinner-sm" role="status" aria-label="로딩 중" />
      </div>
    );
  }

  if (!session) return null;

  const userInitial = session.user?.name ? session.user.name.charAt(0) : 'U';

  return (
    <>
      <nav 
        style={{
          position: 'fixed',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '90%',
          maxWidth: '1200px',
          background: 'rgba(10, 16, 30, 0.75)',
          backdropFilter: 'blur(20px)',
          borderRadius: '9999px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: '0 12px 40px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
          padding: '6px 12px 6px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          zIndex: 1000,
          transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        {/* Desktop nav links */}
        <ul 
          className="nav-links-desktop"
          style={{
            display: 'flex',
            listStyle: 'none',
            margin: 0,
            padding: 0,
            gap: '6px',
            alignItems: 'center'
          }}
        >
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  style={{
                    display: 'block',
                    padding: '8px 18px',
                    borderRadius: '9999px',
                    fontSize: '0.85rem',
                    fontWeight: isActive ? 600 : 500,
                    color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
                    background: isActive ? 'rgba(255, 255, 255, 0.07)' : 'transparent',
                    textDecoration: 'none',
                    border: isActive ? '1px solid rgba(255, 255, 255, 0.05)' : '1px solid transparent',
                    boxShadow: isActive ? '0 2px 8px rgba(0,0,0,0.2)' : 'none',
                    transition: 'all 300ms cubic-bezier(0.32, 0.72, 0, 1)'
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.color = 'var(--text-primary)';
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.color = 'var(--text-muted)';
                      e.currentTarget.style.background = 'transparent';
                    }
                  }}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>

        {/* Right section */}
        <div 
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}
        >
          {/* User profile chip */}
          <div 
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              borderRadius: '9999px',
              padding: '4px 14px 4px 6px',
            }}
          >
            <div 
              style={{
                width: '26px',
                height: '26px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #b09a5c 0%, #8e763f 100%)',
                boxShadow: '0 2px 6px rgba(176,154,92,0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                fontWeight: 'bold',
                fontSize: '0.8rem',
                userSelect: 'none'
              }}
            >
              {userInitial}
            </div>
            <span 
              style={{
                fontSize: '0.8rem',
                fontWeight: 600,
                color: 'var(--text-primary)',
              }}
            >
              {session.user?.name}
            </span>
          </div>

          <button 
            onClick={handleLogout} 
            style={{
              background: 'transparent',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '9999px',
              color: 'var(--text-muted)',
              fontSize: '0.8rem',
              fontWeight: 500,
              padding: '6px 16px',
              cursor: 'pointer',
              transition: 'all 200ms ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.4)';
              e.currentTarget.style.color = '#ef4444';
              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.03)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
              e.currentTarget.style.color = 'var(--text-muted)';
              e.currentTarget.style.background = 'transparent';
            }}
          >
            로그아웃
          </button>

          {/* Hamburger for mobile */}
          <button
            className="hamburger"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-label="메뉴 열기"
            aria-expanded={mobileOpen}
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '50%',
              width: '36px',
              height: '36px',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              position: 'relative',
              zIndex: 1001
            }}
          >
            <div 
              style={{
                width: '16px',
                height: '12px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                position: 'relative'
              }}
            >
              <span
                style={{
                  width: '100%',
                  height: '1.5px',
                  background: 'var(--text-primary)',
                  borderRadius: '1px',
                  transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                  transformOrigin: '1px 1px',
                  transform: mobileOpen ? 'rotate(45deg) translate(2px, 1px)' : 'none'
                }}
              />
              <span
                style={{
                  width: '100%',
                  height: '1.5px',
                  background: 'var(--text-primary)',
                  borderRadius: '1px',
                  transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                  opacity: mobileOpen ? 0 : 1
                }}
              />
              <span
                style={{
                  width: '100%',
                  height: '1.5px',
                  background: 'var(--text-primary)',
                  borderRadius: '1px',
                  transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                  transformOrigin: '1px 11px',
                  transform: mobileOpen ? 'rotate(-45deg) translate(2px, -1px)' : 'none'
                }}
              />
            </div>
          </button>
        </div>
      </nav>

      {/* Mobile nav - full-screen glass overlay */}
      <div
        ref={mobileNavRef}
        style={{
          position: 'fixed',
          inset: 0,
          width: '100vw',
          height: '100dvh',
          background: 'rgba(5, 8, 16, 0.94)',
          backdropFilter: 'blur(32px)',
          zIndex: 999,
          padding: '100px 32px 32px 32px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          opacity: mobileOpen ? 1 : 0,
          pointerEvents: mobileOpen ? 'auto' : 'none',
          transform: mobileOpen ? 'translateY(0)' : 'translateY(-20px)',
          transition: 'opacity 0.4s cubic-bezier(0.16, 1, 0.3, 1), transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        <div 
          style={{ 
            padding: 'var(--space-md) var(--space-md) var(--space-sm) var(--space-md)', 
            borderBottom: '1px solid rgba(255, 255, 255, 0.05)', 
            marginBottom: 'var(--space-md)' 
          }}
        >
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>로그인된 사용자</span>
          <strong style={{ fontSize: '1.25rem', color: 'var(--text-primary)', display: 'block', marginTop: '4px' }}>{session.user?.name}</strong>
        </div>
        
        {navItems.map((item, idx) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              style={{
                display: 'block',
                padding: '12px 16px',
                borderRadius: 'var(--radius-md)',
                fontSize: '1.1rem',
                fontWeight: isActive ? 600 : 500,
                color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
                background: isActive ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
                textDecoration: 'none',
                opacity: mobileOpen ? 1 : 0,
                transform: mobileOpen ? 'translateY(0)' : 'translateY(12px)',
                transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                transitionDelay: `${(idx + 1) * 0.05}s`
              }}
            >
              {item.label}
            </Link>
          );
        })}
        
        <button
          onClick={() => { setMobileOpen(false); handleLogout(); }}
          style={{
            marginTop: 'var(--space-xl)',
            padding: '14px',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(239, 68, 68, 0.05)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            color: '#ef4444',
            fontWeight: 600,
            fontSize: '1rem',
            cursor: 'pointer',
            opacity: mobileOpen ? 1 : 0,
            transform: mobileOpen ? 'translateY(0)' : 'translateY(12px)',
            transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
            transitionDelay: `${(navItems.length + 1) * 0.05}s`
          }}
        >
          로그아웃
        </button>
      </div>
    </>
  );
}
