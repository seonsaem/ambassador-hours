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
        disabled={disabled}
        className={`custom-dropdown-trigger ${!categoryId ? 'is-placeholder' : ''}`}
      >
        <span
          style={{
            minWidth: 0,
            flex: 1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            marginRight: '8px',
          }}
        >
          {selectedCategory ? selectedCategory.categoryName : '카테고리를 선택하세요'}
        </span>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            transition: 'transform 200ms ease',
            transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            color: 'var(--text-muted)',
            flexShrink: 0,
          }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {dropdownOpen && (
        <div className="custom-dropdown-menu">
          {/* 공식 활동 그룹 */}
          {officialCategories.length > 0 && (
            <div style={{ marginBottom: '6px' }}>
              <div
                className="custom-dropdown-group-label"
                style={{ color: '#1e40af' }}
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
                    className={`custom-dropdown-item ${isCurrent ? 'is-selected' : ''}`}
                  >
                    <span style={{ minWidth: 0, flex: 1, paddingRight: '10px', wordBreak: 'keep-all', overflowWrap: 'break-word' }}>
                      {cat.categoryName}
                    </span>
                    <span
                      style={{
                        fontSize: '0.74rem',
                        color: isCurrent ? '#1e40af' : 'var(--text-muted)',
                        fontWeight: 600,
                        flexShrink: 0,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {cat.assignedHours === 0 ? '가변' : `${cat.assignedHours}시간`}
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
                className="custom-dropdown-group-label"
                style={{
                  color: '#0f766e',
                  borderTop: officialCategories.length > 0 ? '1px solid var(--border-subtle)' : 'none',
                  paddingTop: '10px',
                  marginTop: '4px',
                }}
              >
                자율 활동
              </div>
              {sortedDepts.map((dept) => (
                <div key={dept} style={{ marginBottom: '6px' }}>
                  <div
                    style={{
                      padding: '4px 12px 2px 14px',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      color: 'var(--text-muted)',
                    }}
                  >
                    • {dept}
                  </div>
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
                        className={`custom-dropdown-item ${isCurrent ? 'is-selected' : ''}`}
                        style={{ paddingLeft: '24px' }}
                      >
                        <span style={{ minWidth: 0, flex: 1, paddingRight: '10px', wordBreak: 'keep-all', overflowWrap: 'break-word' }}>
                          {cat.categoryName}
                        </span>
                        <span
                          style={{
                            fontSize: '0.74rem',
                            color: isCurrent ? '#1e40af' : 'var(--text-muted)',
                            fontWeight: 600,
                            flexShrink: 0,
                            whiteSpace: 'nowrap',
                          }}
                        >
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
