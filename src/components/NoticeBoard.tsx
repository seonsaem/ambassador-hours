'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';

interface NoticeAuthor {
  id: number;
  name: string;
  email: string;
}

interface Notice {
  id: number;
  title: string;
  content: string;
  isPinned: boolean;
  authorId: number;
  author: NoticeAuthor;
  createdAt: string;
  updatedAt: string;
}

export default function NoticeBoard() {
  const { data: session } = useSession();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // Write mode
  const [isWriting, setIsWriting] = useState(false);
  const [writeTitle, setWriteTitle] = useState('');
  const [writeContent, setWriteContent] = useState('');
  const [writeLoading, setWriteLoading] = useState(false);

  // Edit mode
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  // Error state
  const [error, setError] = useState('');

  const fetchNotices = useCallback(async () => {
    try {
      const res = await fetch('/api/notices');
      if (res.ok) {
        const data = await res.json();
        setNotices(data);
      }
    } catch (err) {
      console.error('Failed to fetch notices', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotices();
  }, [fetchNotices]);

  const handleCreate = async () => {
    if (!writeTitle.trim() || !writeContent.trim()) return;
    setWriteLoading(true);
    setError('');
    try {
      const res = await fetch('/api/notices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: writeTitle, content: writeContent }),
      });
      if (res.ok) {
        setWriteTitle('');
        setWriteContent('');
        setIsWriting(false);
        await fetchNotices();
      } else {
        const data = await res.json();
        setError(data.error || '공지 작성에 실패했습니다.');
      }
    } catch {
      setError('공지 작성 중 오류가 발생했습니다.');
    } finally {
      setWriteLoading(false);
    }
  };

  const handleUpdate = async (id: number) => {
    if (!editTitle.trim() || !editContent.trim()) return;
    setEditLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/notices/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editTitle, content: editContent }),
      });
      if (res.ok) {
        setEditingId(null);
        await fetchNotices();
      } else {
        const data = await res.json();
        setError(data.error || '공지 수정에 실패했습니다.');
      }
    } catch {
      setError('공지 수정 중 오류가 발생했습니다.');
    } finally {
      setEditLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('정말로 이 공지를 삭제하시겠습니까?')) return;
    setError('');
    try {
      const res = await fetch(`/api/notices/${id}`, { method: 'DELETE' });
      if (res.ok) {
        if (expandedId === id) setExpandedId(null);
        await fetchNotices();
      } else {
        const data = await res.json();
        setError(data.error || '공지 삭제에 실패했습니다.');
      }
    } catch {
      setError('공지 삭제 중 오류가 발생했습니다.');
    }
  };

  const openEdit = (notice: Notice) => {
    setEditingId(notice.id);
    setEditTitle(notice.title);
    setEditContent(notice.content);
    setExpandedId(notice.id);
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return '방금 전';
    if (diffMins < 60) return `${diffMins}분 전`;
    if (diffHours < 24) return `${diffHours}시간 전`;
    if (diffDays < 7) return `${diffDays}일 전`;

    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}.${mm}.${dd}`;
  };

  return (
    <div className="notice-board">
      {/* Header */}
      <div className="notice-board-header">
        <div className="notice-board-header-left">
          <div className="notice-board-icon-wrap">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
          </div>
          <h2 className="notice-board-title">공지사항</h2>
          <span className="notice-board-count">{notices.length}</span>
        </div>
        <button
          className="notice-board-write-btn"
          onClick={() => { setIsWriting(!isWriting); setEditingId(null); }}
          aria-label="공지 작성"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          <span>작성</span>
        </button>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="notice-error-alert">
          <span>⚠️ {error}</span>
          <button onClick={() => setError('')} aria-label="닫기">✕</button>
        </div>
      )}

      {/* Write Form */}
      <div className={`notice-write-form ${isWriting ? 'notice-write-form--open' : ''}`}>
        <div className="notice-write-form-inner">
          <input
            type="text"
            className="notice-write-input"
            placeholder="공지 제목"
            value={writeTitle}
            onChange={(e) => setWriteTitle(e.target.value)}
            maxLength={100}
            disabled={writeLoading}
          />
          <textarea
            className="notice-write-textarea"
            placeholder="공지 내용을 입력해 주세요…"
            value={writeContent}
            onChange={(e) => setWriteContent(e.target.value)}
            rows={3}
            maxLength={2000}
            disabled={writeLoading}
          />
          <div className="notice-write-actions">
            <span className="notice-write-charcount">
              {writeContent.length}/2000
            </span>
            <div className="notice-write-btns">
              <button
                className="notice-action-btn notice-action-btn--cancel"
                onClick={() => { setIsWriting(false); setWriteTitle(''); setWriteContent(''); }}
                disabled={writeLoading}
              >
                취소
              </button>
              <button
                className="notice-action-btn notice-action-btn--submit"
                onClick={handleCreate}
                disabled={writeLoading || !writeTitle.trim() || !writeContent.trim()}
              >
                {writeLoading ? (
                  <span className="notice-btn-loading">
                    <span className="loading-spinner-sm" />
                    게시 중…
                  </span>
                ) : '게시'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Notice List */}
      <div className="notice-list">
        {loading ? (
          <div className="notice-skeleton-list">
            {[1, 2, 3].map((i) => (
              <div key={i} className="notice-skeleton-item">
                  <div style={{ flex: 1 }}>
                  <div className="skeleton skeleton-text" style={{ width: '60%' }} />
                  <div className="skeleton skeleton-text" style={{ width: '40%', marginTop: '6px' }} />
                </div>
              </div>
            ))}
          </div>
        ) : notices.length === 0 ? (
          <div className="notice-empty">
            <div className="notice-empty-icon">📌</div>
            <p className="notice-empty-text">아직 공지사항이 없습니다</p>
            <p className="notice-empty-sub">첫 공지를 작성해 보세요</p>
          </div>
        ) : (
          notices.map((notice, index) => {
            const isExpanded = expandedId === notice.id;
            const isEditing = editingId === notice.id;

            return (
              <div
                key={notice.id}
                className={`notice-item ${isExpanded ? 'notice-item--expanded' : ''} ${notice.isPinned ? 'notice-item--pinned' : ''}`}
                style={{ animationDelay: `${index * 60}ms` }}
              >
                {/* Collapsed View */}
                <button
                  className="notice-item-header"
                  onClick={() => {
                    if (isEditing) return;
                    setExpandedId(isExpanded ? null : notice.id);
                  }}
                >
                  <div className="notice-item-meta">
                    <div className="notice-item-title-row">
                      {notice.isPinned && (
                        <span className="notice-pin-badge">📌</span>
                      )}
                      <span className="notice-item-title">{notice.title}</span>
                    </div>
                    <div className="notice-item-info">
                      <span className="notice-item-author">{notice.author.name}</span>
                      <span className="notice-item-dot">·</span>
                      <span className="notice-item-date">{formatDate(notice.createdAt)}</span>
                      {notice.updatedAt !== notice.createdAt && (
                        <>
                          <span className="notice-item-dot">·</span>
                          <span className="notice-item-edited">수정됨</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className={`notice-item-chevron ${isExpanded ? 'notice-item-chevron--open' : ''}`}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </div>
                </button>

                {/* Expanded Content */}
                <div className={`notice-item-body ${isExpanded ? 'notice-item-body--visible' : ''}`}>
                  {isEditing ? (
                    <div className="notice-edit-form">
                      <input
                        type="text"
                        className="notice-write-input"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        maxLength={100}
                        disabled={editLoading}
                      />
                      <textarea
                        className="notice-write-textarea"
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        rows={4}
                        maxLength={2000}
                        disabled={editLoading}
                      />
                      <div className="notice-write-actions">
                        <span className="notice-write-charcount">
                          {editContent.length}/2000
                        </span>
                        <div className="notice-write-btns">
                          <button
                            className="notice-action-btn notice-action-btn--cancel"
                            onClick={() => setEditingId(null)}
                            disabled={editLoading}
                          >
                            취소
                          </button>
                          <button
                            className="notice-action-btn notice-action-btn--submit"
                            onClick={() => handleUpdate(notice.id)}
                            disabled={editLoading || !editTitle.trim() || !editContent.trim()}
                          >
                            {editLoading ? (
                              <span className="notice-btn-loading">
                                <span className="loading-spinner-sm" />
                                저장 중…
                              </span>
                            ) : '저장'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="notice-item-content">
                        {notice.content.split('\n').map((line, i) => (
                          <p key={i}>{line || '\u00A0'}</p>
                        ))}
                      </div>
                      <div className="notice-item-footer">
                        <button
                          className="notice-footer-btn"
                          onClick={(e) => { e.stopPropagation(); openEdit(notice); }}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                          수정
                        </button>
                        <button
                          className="notice-footer-btn notice-footer-btn--danger"
                          onClick={(e) => { e.stopPropagation(); handleDelete(notice.id); }}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                          삭제
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
