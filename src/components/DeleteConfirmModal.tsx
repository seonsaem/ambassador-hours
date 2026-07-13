import React from 'react';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading: boolean;
  userName?: string;
  categoryName?: string;
}

export default function DeleteConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  isLoading,
  userName,
  categoryName
}: DeleteConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal glass-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">활동 내역 삭제</h3>
          <button className="modal-close" onClick={onClose} aria-label="모달 닫기">✕</button>
        </div>
        <div className="modal-body">
          <div className="modal-info">
            <p>
              {userName && categoryName ? (
                <>
                  <strong>{userName}</strong>님의 <strong>{categoryName}</strong> 활동 내역을 정말로 삭제하시겠습니까?
                </>
              ) : (
                '이 활동 신청을 정말로 삭제하시겠습니까?'
              )}
            </p>
            <p style={{ color: 'var(--danger)', fontSize: '0.85rem', marginTop: '0.5rem' }}>
              ⚠️ 삭제 후에는 복구할 수 없습니다.
            </p>
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
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="btn-loading">
                <span className="loading-spinner-sm" />
                삭제 중…
              </span>
            ) : (
              '삭제 확인'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
