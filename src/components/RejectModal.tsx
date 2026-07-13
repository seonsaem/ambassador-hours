import React from 'react';
import type { GroupedRequest } from '@/types';

interface RejectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVerify: () => void;
  isLoading: boolean;
  groupedRequest: GroupedRequest | null;
  rejectReason: string;
  setRejectReason: (reason: string) => void;
}

export default function RejectModal({
  isOpen,
  onClose,
  onVerify,
  isLoading,
  groupedRequest,
  rejectReason,
  setRejectReason
}: RejectModalProps) {
  if (!isOpen || !groupedRequest) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal glass-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">요청 반려</h3>
          <button className="modal-close" onClick={onClose} aria-label="모달 닫기">✕</button>
        </div>
        <div className="modal-body">
          <div className="modal-info">
            {groupedRequest.bulkLabel ? (
              <p>
                <strong>{groupedRequest.bulkLabel}</strong> 통합 신청 요청 (대상자: <strong>{groupedRequest.users.map(u => u.name).join(', ')}</strong>)을 반려합니다.
              </p>
            ) : (
              <p>
                <strong>{groupedRequest.users[0]?.name}</strong>님의 <strong>{groupedRequest.category?.categoryName}</strong> 활동을 반려합니다.
              </p>
            )}
          </div>
          <div className="form-group" style={{ marginTop: '1rem' }}>
            <label htmlFor="rejectReason" className="form-label" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
              반려 사유 (필수)
            </label>
            <textarea
              id="rejectReason"
              className="form-textarea"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="반려 사유를 상세하게 입력해주세요…"
              rows={3}
              required
              style={{
                width: '100%',
                padding: '0.75rem',
                background: 'rgba(0, 0, 0, 0.2)',
                border: '1px solid var(--glass-border)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-primary)',
                fontFamily: 'inherit',
                fontSize: '0.9rem',
                outline: 'none',
                resize: 'vertical'
              }}
            />
          </div>
        </div>
        <div className="modal-footer">
          <button
            className="btn btn-outline"
            onClick={onClose}
            disabled={isLoading}
          >
            취소
          </button>
          <button
            className="btn btn-danger"
            onClick={onVerify}
            disabled={!rejectReason.trim() || isLoading}
          >
            {isLoading ? (
              <span className="btn-loading">
                <span className="loading-spinner-sm" />
                처리 중…
              </span>
            ) : (
              '반려 확인'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
