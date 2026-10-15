'use client';

import React from 'react';

interface MetricCardProps {
  title: string;
  value: number;
  unit?: string;
  gradient: 'purple' | 'teal' | 'gold';
  onClick?: () => void;
  isActive?: boolean;
  count?: number;
}

const iconMap: Record<MetricCardProps['gradient'], React.ReactNode> = {
  purple: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
      <path d="m9 14 2 2 4-4" />
    </svg>
  ),
  teal: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  ),
  gold: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  ),
};

export default function MetricCard({
  title,
  value,
  unit = '시간',
  gradient,
  onClick,
  isActive = false,
  count,
}: MetricCardProps) {
  return (
    <div
      className={`metric-card metric-card-${gradient} ${onClick ? 'metric-card-clickable' : ''} ${isActive ? 'metric-card-active' : ''}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-expanded={onClick ? isActive : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
    >
      <div className="metric-card-inner-wrap">
        <div className="metric-card-inner">
          <div className="metric-card-icon" aria-hidden="true">
            {iconMap[gradient]}
          </div>
          <div className="metric-card-content">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
              <div className="metric-card-title">{title}</div>
              {onClick && (
                <span className="metric-card-hint">
                  {isActive ? '접기 ▲' : '내역 보기 ▼'}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '8px' }}>
              <div className="metric-card-value">
                {value.toFixed(1)}
                <span className="metric-card-unit">{unit}</span>
              </div>
              {typeof count === 'number' && (
                <span className="metric-card-count">
                  총 {count}건
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
