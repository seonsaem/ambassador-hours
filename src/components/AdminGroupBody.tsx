import React from 'react';
import type { Request, User } from '@/types';

interface AdminGroupBodyProps {
  requests: Request[];
  filterStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  actionLoading: number | null;
  expanded: Set<number>;
  toggleExpand: (id: number) => void;
  formatDateOnly: (dateStr: string) => string;
  setDeleteRequest: (req: Request) => void;
}

export default function AdminGroupBody({
  requests,
  filterStatus,
  actionLoading,
  expanded,
  toggleExpand,
  formatDateOnly,
  setDeleteRequest
}: AdminGroupBodyProps) {
  return (
    <div className="user-group-body">
      {requests.length === 0 ? (
        <p className="empty-state-text" style={{ fontSize: '0.9rem', color: 'var(--text-muted)', margin: 0, textAlign: 'center', padding: 'var(--space-md)' }}>
          {filterStatus === 'APPROVED' ? '승인된 활동 내역이 없습니다.' : '반려된 활동 내역이 없습니다.'}
        </p>
      ) : (
        requests.map((req) => {
          const isThisLoading = actionLoading === req.id;
          return (
            <div key={req.id} className="user-group-item">
              <div className="user-group-item-top">
                <div className="user-group-item-meta">
                  <span className="request-category">{req.category?.categoryName}</span>
                  {req.activityType && (
                    <span className={`badge ${req.activityType === 'OFFICIAL' ? 'badge-purple' : 'badge-teal'}`}>
                      {req.activityType === 'OFFICIAL' ? '공식' : '자율'}
                    </span>
                  )}
                  {req.appliedHours !== null && req.appliedHours > 0 && (
                    <span className="user-group-item-hours">{req.appliedHours}시간</span>
                  )}
                </div>
                <span className="request-date">활동일: {formatDateOnly(req.activityDate || req.createdAt)}</span>
              </div>
              <p className="user-group-item-desc" style={{
                margin: '0 0 var(--space-sm) 0',
                ...(!expanded.has(req.id) ? {
                  display: '-webkit-box',
                  WebkitLineClamp: 1,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'pre-wrap'
                } : {
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all'
                })
              }}>
                {req.description}
              </p>
              {req.description.length > 40 && (
                <button className="btn-text" onClick={() => toggleExpand(req.id)} style={{ color: '#b09a5c', fontWeight: 600, fontSize: '0.8rem', marginBottom: 'var(--space-sm)', display: 'inline-block' }}>
                  {expanded.has(req.id) ? '간략히 보기' : '자세히 보기'}
                </button>
              )}
              {req.rejectedReason && (
                <p className="user-group-item-reason">반려 사유: {req.rejectedReason}</p>
              )}
              {req.evidenceFileUrl && (
                <a href={req.evidenceFileUrl} target="_blank" rel="noopener noreferrer" className="evidence-link" style={{ fontSize: '0.8rem' }}>
                  📎 증빙 파일
                </a>
              )}
              <div className="user-group-item-actions">
                <button
                  className="btn btn-outline-danger btn-sm"
                  onClick={() => setDeleteRequest(req)}
                  disabled={isThisLoading}
                >
                  {isThisLoading ? <span className="loading-spinner-sm" /> : '삭제'}
                </button>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
