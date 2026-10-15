import React, { useState } from 'react';
import StatusBadge from '@/components/StatusBadge';
import type { GroupedRequest, Request, User } from '@/types';

const sortUsersByGeneration = (users: User[]): User[] => {
  const getGeneration = (name: string): number => {
    const match = name.match(/(\d+)기/);
    return match ? parseInt(match[1], 10) : Infinity;
  };

  return [...users].sort((a, b) => {
    const genA = getGeneration(a.name);
    const genB = getGeneration(b.name);
    if (genA !== genB) {
      return genA - genB;
    }
    return a.name.localeCompare(b.name, 'ko');
  });
};

interface DashboardRequestCardProps {
  group: GroupedRequest;
  index: number;
  canModify: boolean;
  expanded: Set<number>;
  toggleExpand: (id: number) => void;
  expandedReasons: Set<number>;
  toggleExpandReason: (id: number) => void;
  openEditModal: (req: Request) => void;
  handleDeleteClick: (id: number) => void;
  getActivityBadge: (type: string | null) => React.ReactNode;
  formatDate: (dateStr: string) => string;
}

export default function DashboardRequestCard({
  group,
  index,
  canModify,
  expanded,
  toggleExpand,
  expandedReasons,
  toggleExpandReason,
  openEditModal,
  handleDeleteClick,
  getActivityBadge,
  formatDate
}: DashboardRequestCardProps) {
  const firstReq = group.requests[0];
  const key = group.id;
  const [usersExpanded, setUsersExpanded] = useState(false);

  return (
    <div
      key={key}
      className={`request-card request-card-${group.status.toLowerCase()}`}
      style={{ animationDelay: `${index * 0.04}s`, display: 'flex', flexDirection: 'column' }}
    >
      <div
        className="request-card-header"
        style={{
          flexDirection: 'column',
          alignItems: 'stretch',
          gap: '0.65rem',
          paddingBottom: '0.85rem',
          borderBottom: '1px solid var(--border-subtle)',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', width: '100%', minWidth: 0 }}>
          <span
            className="request-category"
            style={{
              fontSize: '1.05rem',
              lineHeight: '1.35',
              wordBreak: 'keep-all',
              overflowWrap: 'break-word',
              fontWeight: 700,
              display: 'block',
            }}
            title={group.category?.categoryName}
          >
            {group.category?.categoryName}
          </span>
          <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <StatusBadge status={group.status} />
            {getActivityBadge(group.activityType || group.category?.activityType || null)}
            {group.category?.department && (
              <span className="badge badge-gold" style={{ fontSize: '0.72rem' }}>
                {group.category.department}
              </span>
            )}
            {group.bulkLabel && (
              <span className="badge badge-outline" style={{ fontSize: '0.72rem' }}>
                통합 신청 ({group.users.length}명)
              </span>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', marginTop: '0.15rem', flexWrap: 'wrap' }}>
          {group.bulkLabel ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span className="admin-request-username" style={{ fontSize: '0.92rem', fontWeight: 600 }}>
                {sortUsersByGeneration(group.users)[0]?.name || '로딩중…'}
                {group.users.length > 1 ? ` 외 ${group.users.length - 1}명` : ''}
              </span>
              <button
                className="btn-text"
                onClick={() => setUsersExpanded(!usersExpanded)}
                style={{ fontSize: '0.8rem', padding: '0 4px' }}
              >
                {usersExpanded ? '접기' : '명단 보기'}
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span className="admin-request-username" style={{ fontSize: '0.92rem', fontWeight: 600 }}>
                {group.users[0]?.name}
              </span>
            </div>
          )}

          {canModify && (group.status === 'PENDING' || group.status === 'REJECTED') && (
            <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center', flexShrink: 0, marginLeft: 'auto' }}>
              <button
                className="btn btn-outline btn-sm"
                style={{ padding: '4px 10px', fontSize: '0.78rem' }}
                onClick={() => openEditModal(firstReq)}
              >
                수정
              </button>
              <button
                className="btn btn-outline-danger btn-sm"
                style={{ padding: '4px 10px', fontSize: '0.78rem' }}
                onClick={() => handleDeleteClick(firstReq.id)}
              >
                삭제
              </button>
            </div>
          )}
        </div>
      </div>

      {group.bulkLabel && usersExpanded && (
        <div className="bulk-users-expanded-list">
          {sortUsersByGeneration(group.users).map((u: User) => (
            <div key={u.id} className="badge badge-outline" style={{ fontSize: '0.75rem', padding: '0.2rem 0.55rem', background: 'var(--bg-secondary)' }}>
              <span style={{ fontWeight: 600 }}>{u.name}</span>
            </div>
          ))}
        </div>
      )}

      <div className="request-description" style={{ marginTop: '0.85rem', flexGrow: 1 }}>
        <p
          style={{
            margin: 0,
            width: '100%',
            fontSize: '0.92rem',
            lineHeight: '1.6',
            color: 'var(--text-secondary)',
            ...(!expanded.has(firstReq.id)
              ? {
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all',
                }
              : {
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all',
                }),
          }}
        >
          {group.description}
        </p>
        {(group.description.length > 50 || group.description.includes('\n')) && (
          <button
            className="btn-text"
            onClick={() => toggleExpand(firstReq.id)}
            style={{ padding: '4px 0', fontSize: '0.8rem', marginTop: '0.35rem', display: 'inline-block' }}
          >
            {expanded.has(firstReq.id) ? '간략히 보기' : '자세히 보기'}
          </button>
        )}
      </div>

      {group.status === 'REJECTED' && group.rejectedReason && (
        <div className="request-rejected-info">
          <p
            className="rejected-reason"
            style={{
              margin: 0,
              width: '100%',
              textAlign: 'left',
              ...(!expandedReasons.has(firstReq.id)
                ? {
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'normal',
                  }
                : {
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-all',
                  }),
            }}
          >
            <span className="rejected-reason-label">반려 사유:</span>
            {group.rejectedReason}
          </p>
          {group.rejectedReason.length > 60 && (
            <button
              className="btn-text"
              onClick={() => toggleExpandReason(firstReq.id)}
              style={{ padding: '4px 0', fontSize: '0.78rem', marginTop: '4px', display: 'inline-block', color: 'var(--danger)' }}
            >
              {expandedReasons.has(firstReq.id) ? '간략히 보기' : '자세히 보기'}
            </button>
          )}
        </div>
      )}

      {group.evidenceFileUrl && (
        <div className="request-evidence" style={{ marginTop: '0.65rem' }}>
          <a href={group.evidenceFileUrl} target="_blank" rel="noopener noreferrer" className="evidence-link">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" />
            </svg>
            증빙 파일
          </a>
        </div>
      )}

      <div
        className="request-card-footer"
        style={{
          marginTop: '1rem',
          paddingTop: '0.85rem',
          borderTop: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 500 }}>활동 일자</span>
          <span className="request-date" style={{ color: 'var(--text-primary)', fontSize: '0.88rem', fontWeight: 600 }}>
            {formatDate(group.activityDate || group.createdAt)}
          </span>
        </div>
        {group.appliedHours !== null && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '1px' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 500 }}>신청 시간</span>
            <span className="request-hours" style={{ margin: 0, color: 'var(--primary)', fontSize: '1.1rem' }}>
              {group.appliedHours}시간
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
