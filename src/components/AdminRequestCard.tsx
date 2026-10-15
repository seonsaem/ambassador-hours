import React from 'react';
import type { GroupedRequest, User } from '@/types';

interface AdminRequestCardProps {
  group: GroupedRequest;
  actionLoading: number | null;
  expanded: Set<number>;
  toggleExpand: (id: number) => void;
  expandedUsersList: Set<string>;
  toggleUsersList: (id: string) => void;
  handleApprove: (group: GroupedRequest) => void;
  setRejectModal: (group: GroupedRequest) => void;
  setRejectReason: (reason: string) => void;
  formatDateOnly: (dateStr: string) => string;
}

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

export default function AdminRequestCard({
  group,
  actionLoading,
  expanded,
  toggleExpand,
  expandedUsersList,
  toggleUsersList,
  handleApprove,
  setRejectModal,
  setRejectReason,
  formatDateOnly
}: AdminRequestCardProps) {
  const isThisLoading = group.requests.some((r) => actionLoading === r.id);
  const cleanBulkLabel = group.bulkLabel
    ? group.bulkLabel.replace(/^일괄신청_/, '').replace(/_[a-z0-9]{5,}$/i, '')
    : '';

  return (
    <div key={group.id} className="admin-request-card">
      <div className="admin-request-header">
        <div className="admin-request-user">
          {group.bulkLabel ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%' }}>
              <span
                className="badge badge-outline"
                style={{
                  alignSelf: 'flex-start',
                  marginBottom: '2px',
                  whiteSpace: 'normal',
                  wordBreak: 'keep-all',
                  overflowWrap: 'break-word',
                }}
              >
                통합 신청{cleanBulkLabel && !/^\d{4}-\d{2}-\d{2}$/.test(cleanBulkLabel) ? `: ${cleanBulkLabel}` : ` (${group.users.length}명)`}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <span className="admin-request-username">
                  {group.createdBy?.name || sortUsersByGeneration(group.users)[0]?.name}
                  {group.users.length > 1 ? ` 외 ${group.users.length - 1}명` : ''}
                </span>
                <button
                  className="btn-text"
                  onClick={() => toggleUsersList(group.id)}
                  style={{ fontSize: '0.8rem', fontWeight: 600 }}
                >
                  {expandedUsersList.has(group.id) ? '접기' : '명단 보기'}
                </button>
              </div>
            </div>
          ) : (
            <span className="admin-request-username">{group.users[0]?.name}</span>
          )}
        </div>
        <span className="request-date" style={{ flexShrink: 0 }}>
          활동일: {formatDateOnly(group.activityDate || group.createdAt)}
        </span>
      </div>

      {group.bulkLabel && expandedUsersList.has(group.id) && (
        <div className="bulk-users-expanded-list">
          {sortUsersByGeneration(group.users).map((u: User) => (
            <div key={u.id} className="badge badge-outline" style={{ fontSize: '0.75rem', padding: '0.2rem 0.55rem', background: 'var(--bg-secondary)' }}>
              <span style={{ fontWeight: 600 }}>{u.name}</span>
            </div>
          ))}
        </div>
      )}

      <div className="admin-request-meta">
        {group.category?.department && (
          <span className="badge badge-gold" style={{ fontSize: '0.7rem' }}>
            {group.category.department}
          </span>
        )}
        <span className="request-category">{group.category?.categoryName}</span>
        <span className={`badge ${(group.activityType || group.category?.activityType) === 'OFFICIAL' ? 'badge-purple' : 'badge-teal'}`}>
          {(group.activityType || group.category?.activityType) === 'OFFICIAL' ? '공식' : '자율'}
        </span>
        <span className="badge badge-outline">
          {group.appliedHours}시간
        </span>
      </div>

      <div className="admin-request-description">
        <p
          style={{
            margin: 0,
            width: '100%',
            ...(!expanded.has(group.requests[0].id)
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
            onClick={() => toggleExpand(group.requests[0].id)}
            style={{ marginTop: '4px' }}
          >
            {expanded.has(group.requests[0].id) ? '간략히 보기' : '자세히 보기'}
          </button>
        )}
      </div>

      {group.evidenceFileUrl && (
        <div className="admin-request-evidence">
          <a href={group.evidenceFileUrl} target="_blank" rel="noopener noreferrer" className="evidence-link">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" />
            </svg>
            증빙 파일 보기
          </a>
        </div>
      )}

      <div className="admin-request-actions">
        <button
          className="btn btn-success btn-sm"
          onClick={() => handleApprove(group)}
          disabled={isThisLoading}
        >
          {isThisLoading ? (
            <span className="btn-loading">
              <span className="loading-spinner-sm" />
            </span>
          ) : (
            '승인'
          )}
        </button>
        <button
          className="btn btn-outline-danger btn-sm"
          onClick={() => {
            setRejectModal(group);
            setRejectReason('');
          }}
          disabled={isThisLoading}
        >
          반려
        </button>
      </div>
    </div>
  );
}
