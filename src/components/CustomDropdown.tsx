'use client';

import React, { useState, useRef, useEffect } from 'react';
import { DEPARTMENTS } from '@/lib/constants';

interface Category {
  id: number;
  categoryName: string;
  activityType: 'OFFICIAL' | 'AUTONOMOUS';
  assignedHours: number;
  isActive: boolean;
  department?: string | null;
}

interface CustomDropdownProps {
  categories: Category[];
  categoryId: number;
  setCategoryId: (id: number) => void;
  disabled?: boolean;
}

export default function CustomDropdown({
  categories,
  categoryId,
  setCategoryId,
  disabled = false,
}: CustomDropdownProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedCategory = categories.find((c) => c.id === categoryId);

  // Grouping logic for Autonomous categories
  const officialCategories = categories.filter((c) => c.activityType === 'OFFICIAL');
  const autonomousCategories = categories.filter((c) => c.activityType === 'AUTONOMOUS');
  
  const departmentsOrder = ['기타 자율', ...DEPARTMENTS];
  
  const groupedAutonomous: { [key: string]: Category[] } = {};
  autonomousCategories.forEach((cat) => {
    const dept = cat.department || '기타 자율';
    if (!groupedAutonomous[dept]) {
      groupedAutonomous[dept] = [];
    }
    groupedAutonomous[dept].push(cat);
  });

  const sortedDepts = Object.keys(groupedAutonomous).sort((a, b) => {
    const idxA = departmentsOrder.indexOf(a);
    const idxB = departmentsOrder.indexOf(b);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return a.localeCompare(b);
  });

  return (
    <div ref={dropdownRef} style={{ position: 'relative', width: '100%' }}>
      <button
        type="button"
        onClick={() => !disabled && setDropdownOpen((prev) => !prev)}
        style={{
          width: '100%',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 16px',
          background: 'rgba(5,5,8,0.3)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 'var(--radius-md)',
          color: categoryId ? 'var(--text-primary)' : 'var(--text-muted)',
          fontSize: '0.9rem',
          cursor: disabled ? 'not-allowed' : 'pointer',
          textAlign: 'left',
          transition: 'all 200ms ease',
        }}
      >
        <span>
          {selectedCategory ? selectedCategory.categoryName : '카테고리를 선택하세요'}
        </span>
        <span
          style={{
            fontSize: '0.6rem',
            transition: 'transform 200ms ease',
            transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            color: 'var(--text-muted)',
          }}
        >
          ▼
        </span>
      </button>

      {dropdownOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            width: '100%',
            background: 'rgba(10, 16, 30, 0.96)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 'var(--radius-md)',
            boxShadow: '0 16px 40px rgba(0, 0, 0, 0.6)',
            zIndex: 1000,
            maxHeight: '300px',
            overflowY: 'auto',
            padding: '6px',
            animation: 'slideDown 0.2s var(--ease-out-expo)',
          }}
        >
          {/* 공식 활동 그룹 */}
          {officialCategories.length > 0 && (
            <div style={{ marginBottom: '8px' }}>
              <div
                style={{
                  padding: '8px 12px 4px 12px',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  color: '#8b5cf6', // Purple color for OFFICIAL theme
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                공식 활동
              </div>
              {officialCategories.map((cat) => {
                const isCurrent = cat.id === categoryId;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      setCategoryId(cat.id);
                      setDropdownOpen(false);
                    }}
                    style={{
                      width: '100%',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '8px 14px',
                      background: isCurrent ? 'rgba(139, 92, 246, 0.1)' : 'transparent',
                      color: isCurrent ? '#a78bfa' : 'var(--text-primary)',
                      border: 0,
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.85rem',
                      fontWeight: isCurrent ? 600 : 500,
                      textAlign: 'left',
                      cursor: 'pointer',
                      transition: 'all 150ms ease',
                    }}
                    onMouseEnter={(e) => {
                      if (!isCurrent) e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                    }}
                    onMouseLeave={(e) => {
                      if (!isCurrent) e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <span>{cat.categoryName}</span>
                    <span style={{ fontSize: '0.7rem', color: isCurrent ? '#a78bfa' : 'var(--text-muted)', opacity: 0.8 }}>
                      {cat.assignedHours}시간
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* 자율 활동 그룹 */}
          {autonomousCategories.length > 0 && (
            <>
              <div
                style={{
                  padding: '8px 12px 4px 12px',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  color: '#b09a5c', // Gold/Teal theme for AUTONOMOUS
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  borderTop: '1px solid rgba(255,255,255,0.05)',
                  paddingTop: '8px',
                  marginTop: '4px',
                }}
              >
                자율 활동
              </div>
              {sortedDepts.map((dept) => (
                <div key={dept} style={{ marginBottom: '6px' }}>
                  {/* 부서 소제목 */}
                  <div
                    style={{
                      padding: '4px 12px 2px 14px',
                      fontSize: '0.68rem',
                      fontWeight: 600,
                      color: 'var(--text-muted)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.02em',
                      opacity: 0.7,
                    }}
                  >
                    • {dept}
                  </div>
                  {/* 부서별 카테고리 버튼 목록 */}
                  {groupedAutonomous[dept].map((cat) => {
                    const isCurrent = cat.id === categoryId;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => {
                          setCategoryId(cat.id);
                          setDropdownOpen(false);
                        }}
                        style={{
                          width: '100%',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '8px 14px 8px 24px', // 부서 밑으로 들여쓰기
                          background: isCurrent ? 'rgba(176,154,92,0.1)' : 'transparent',
                          color: isCurrent ? '#b09a5c' : 'var(--text-primary)',
                          border: 0,
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '0.85rem',
                          fontWeight: isCurrent ? 600 : 500,
                          textAlign: 'left',
                          cursor: 'pointer',
                          transition: 'all 150ms ease',
                        }}
                        onMouseEnter={(e) => {
                          if (!isCurrent) e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                        }}
                        onMouseLeave={(e) => {
                          if (!isCurrent) e.currentTarget.style.background = 'transparent';
                        }}
                      >
                        <span>{cat.categoryName}</span>
                        <span style={{ fontSize: '0.7rem', color: isCurrent ? '#b09a5c' : 'var(--text-muted)', opacity: 0.8 }}>
                          {cat.assignedHours === 0 ? '가변' : `${cat.assignedHours}시간`}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
