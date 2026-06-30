/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import StatusBadge from '@/components/StatusBadge';

interface DashboardRequestCardProps {
  group: any; // GroupedRequest
  index: number;
  canModify: boolean;
  expanded: Set<number>;
  toggleExpand: (id: number) => void;
  expandedReasons: Set<number>;
  toggleExpandReason: (id: number) => void;
  openEditModal: (req: any) => void;
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

  return (
    <div
      key={key}
      className={`request-card request-card-${group.status.toLowerCase()}`}
      style={{ animationDelay: `${index * 0.05}s`, display: 'flex', flexDirection: 'column' }}
    >
      <div className="request-card-header" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '0.75rem', paddingBottom: '1rem', borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1, minWidth: 0 }}>
            <span className="request-category" style={{ 
              fontSize: '1.1rem', 
              lineHeight: '1.3',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              fontWeight: 700,
              display: 'block'
            }} title={group.category?.categoryName}>
              {group.category?.categoryName}
            </span>
            <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <StatusBadge status={group.status} />
              {getActivityBadge(group.activityType)}
              {group.bulkLabel && (
                <span className="badge badge-purple" style={{ fontSize: '0.72rem' }}>통합 신청</span>
              )}
            </div>
          </div>
          {canModify && (group.status === 'PENDING' || group.status === 'REJECTED') && (
            <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexShrink: 0 }}>
              <button
                className="btn btn-outline btn-sm"
                style={{ padding: '4px 10px', fontSize: '0.8rem', height: 'auto', display: 'flex', alignItems: 'center' }}
                onClick={() => openEditModal(firstReq)}
              >
                수정
              </button>
              <button
                className="btn btn-outline-danger btn-sm"
                style={{ padding: '4px 10px', fontSize: '0.8rem', height: 'auto', display: 'flex', alignItems: 'center' }}
                onClick={() => handleDeleteClick(firstReq.id)}
              >
                삭제
              </button>
            </div>
          )}
        </div>
        
        {group.bulkLabel && (
          <div style={{ 
            fontSize: '0.85rem', 
            color: 'var(--text-secondary)', 
            background: 'rgba(255, 255, 255, 0.03)',
            padding: '0.5rem 0.75rem',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginTop: '0.25rem'
          }}>
            <span style={{ opacity: 0.7 }}>👥 신청 인원:</span> 
            <span>
              {group.users[0]?.name || '로딩중…'}
              {group.users.length > 1 ? ` 외 ${group.users.length - 1}명` : ''}
            </span>
          </div>
        )}
      </div>
      
      <div className="request-description" style={{ marginTop: '1rem', flexGrow: 1 }}>
        <p style={{
          margin: 0,
          width: '100%',
          fontSize: '0.95rem',
          lineHeight: '1.6',
          color: 'var(--text-secondary)',
          ...(!expanded.has(firstReq.id) ? {
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
          <button
            className="btn-text"
            onClick={() => toggleExpand(firstReq.id)}
            style={{ padding: '4px 0', fontSize: '0.8rem', marginTop: '0.5rem', display: 'inline-block', color: '#b09a5c', fontWeight: 600 }}
          >
            {expanded.has(firstReq.id) ? '간략히 보기' : '자세히 보기'}
          </button>
        )}
      </div>

      {group.status === 'REJECTED' && group.rejectedReason && (
        <div className="request-rejected-info" style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          width: '100%', 
          padding: '0.75rem', 
          marginTop: '0.5rem', 
          alignItems: 'flex-start',
          background: 'rgba(239, 68, 68, 0.05)',
          borderLeft: '3px solid rgba(239, 68, 68, 0.5)',
          borderRadius: '0 6px 6px 0'
        }}>
          <p className="rejected-reason" style={{
            margin: 0,
            width: '100%',
            textAlign: 'left',
            fontSize: '0.9rem',
            color: 'var(--text-primary)',
            ...(!expandedReasons.has(firstReq.id) ? {
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'normal'
            } : {
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all'
            })
          }}>
            <span className="rejected-reason-label" style={{ color: 'var(--danger)', fontWeight: 600, marginRight: '4px' }}>반려 사유:</span>
            {group.rejectedReason}
          </p>
          {group.rejectedReason.length > 60 && (
            <button
              className="btn-text"
              onClick={() => toggleExpandReason(firstReq.id)}
              style={{ padding: '4px 0', fontSize: '0.8rem', marginTop: '4px', display: 'inline-block', color: 'var(--danger)', fontWeight: 500 }}
            >
              {expandedReasons.has(firstReq.id) ? '간략히 보기' : '자세히 보기'}
            </button>
          )}
        </div>
      )}

      {group.evidenceFileUrl && (
        <div className="request-evidence" style={{ marginTop: '0.75rem', paddingBottom: '0.5rem' }}>
          <a href={group.evidenceFileUrl} target="_blank" rel="noopener noreferrer" className="evidence-link">
            📎 증빙 파일
          </a>
        </div>
      )}

      <div className="request-card-footer" style={{ 
        marginTop: '1.25rem', 
        paddingTop: '1rem', 
        borderTop: '1px solid rgba(255, 255, 255, 0.04)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>활동 일자</span>
          <span className="request-date" style={{ marginRight: 'auto', color: 'var(--text-primary)', fontSize: '0.9rem' }}>
            {formatDate(group.activityDate || group.createdAt)}
          </span>
        </div>
        {group.appliedHours !== null && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>신청 시간</span>
            <span className="request-hours" style={{ margin: 0, color: 'var(--secondary-light)', fontSize: '1.1rem' }}>
              {group.appliedHours}h
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
