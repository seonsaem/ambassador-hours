/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';

interface AdminRequestCardProps {
  group: any; // GroupedRequest
  actionLoading: number | null;
  expanded: Set<number>;
  toggleExpand: (id: number) => void;
  expandedUsersList: Set<string>;
  toggleUsersList: (id: string) => void;
  handleApprove: (group: any) => void;
  setRejectModal: (group: any) => void;
  setRejectReason: (reason: string) => void;
  formatDateOnly: (dateStr: string) => string;
}

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
  const isThisLoading = group.requests.some((r: any) => actionLoading === r.id);

  return (
    <div key={group.id} className="admin-request-card" style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: 'var(--glass-radius)', padding: 'var(--space-lg)' }}>
      <div className="admin-request-header">
        <div className="admin-request-user">
          {group.bulkLabel ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%' }}>
              <span className="badge badge-purple" style={{ alignSelf: 'flex-start', marginBottom: '2px' }}>통합 신청: {group.bulkLabel?.replace('일괄신청_', '')}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <span className="admin-request-username">
                  {group.createdBy?.name || group.users[0]?.name}
                  {group.users.length > 1 ? ` 외 ${group.users.length - 1}명` : ''}
                </span>
                <button
                  className="btn-text"
                  onClick={() => toggleUsersList(group.id)}
                  style={{ fontSize: '0.8rem', fontWeight: 500 }}
                >
                  {expandedUsersList.has(group.id) ? '접기' : '명단 보기'}
                </button>
              </div>
              {expandedUsersList.has(group.id) && (
                <div className="bulk-users-expanded-list" style={{ marginTop: '0.5rem', display: 'flex', flexWrap: 'wrap', gap: '0.4rem', background: 'rgba(255, 255, 255, 0.04)', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--glass-border)', width: '100%' }}>
                  {group.users.map((u: any) => (
                    <div key={u.id} className="badge badge-outline" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}>
                      <span style={{ fontWeight: 600 }}>{u.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <>
              <span className="admin-request-username">{group.users[0]?.name}</span>
            </>
          )}
        </div>
        <span className="request-date">활동일: {formatDateOnly(group.activityDate || group.createdAt)}</span>
      </div>

      <div className="admin-request-meta">
        <span className="request-category">{group.category?.categoryName}</span>
        <span className={`badge ${group.activityType === 'OFFICIAL' ? 'badge-purple' : 'badge-teal'}`}>
          {group.activityType === 'OFFICIAL' ? '공식' : '자율'}
        </span>
        <span className="badge badge-outline">
          {group.appliedHours}시간
        </span>
      </div>

      <div className="admin-request-description">
        <p style={{
          margin: 0,
          width: '100%',
          ...(!expanded.has(group.requests[0].id) ? {
            display: '-webkit-box',
            WebkitLineClamp: 1,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'normal'
          } : {
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all'
          })
        }}>
          {group.description}
        </p>
        {group.description.length > 60 && (
          <button className="btn-text" onClick={() => toggleExpand(group.requests[0].id)} style={{ color: '#b09a5c', fontWeight: 600, marginTop: '4px' }}>
            {expanded.has(group.requests[0].id) ? '간략히 보기' : '자세히 보기'}
          </button>
        )}
      </div>

      {group.evidenceFileUrl && (
        <div className="admin-request-evidence">
          <a href={group.evidenceFileUrl} target="_blank" rel="noopener noreferrer" className="evidence-link">
            📎 증빙 파일 보기
          </a>
        </div>
      )}

      <div className="admin-request-actions">
        <button
          className="btn btn-success"
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
          className="btn btn-danger"
          onClick={() => { setRejectModal(group); setRejectReason(''); }}
          disabled={isThisLoading}
        >
          반려
        </button>
      </div>
    </div>
  );
}
