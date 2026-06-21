'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';

interface User {
  id: number;
  name: string;
  email: string;
}

interface Category {
  id: number;
  categoryName: string;
  activityType: 'OFFICIAL' | 'AUTONOMOUS';
  assignedHours: number;
}

interface Request {
  id: number;
  description: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  activityType: 'OFFICIAL' | 'AUTONOMOUS' | null;
  appliedHours: number | null;
  rejectedReason: string | null;
  evidenceFileUrl: string | null;
  createdAt: string;
  user: User;
  category: Category;
  categoryId: number;
}

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [requests, setRequests] = useState<Request[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [filterStatus, setFilterStatus] = useState<'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING');

  // Reject modal state
  const [rejectModal, setRejectModal] = useState<Request | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // ETC inline edit state
  const [etcEdits, setEtcEdits] = useState<Record<number, {
    activityType: 'OFFICIAL' | 'AUTONOMOUS';
    hours: number;
  }>>({});

  // Expanded descriptions
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  // Expanded user groups
  const [expandedUsers, setExpandedUsers] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated') {
      const role = session?.user?.role;
      if (role !== 'ADMIN') {
        router.push('/dashboard');
      }
    }
  }, [status, session, router]);

  const fetchData = useCallback(async () => {
    try {
      const [reqRes, userRes] = await Promise.all([
        fetch('/api/requests'),
        fetch('/api/users'),
      ]);
      if (!reqRes.ok || !userRes.ok) throw new Error('Failed to fetch');
      const reqData = await reqRes.json();
      const userData = await userRes.json();
      setRequests(reqData);
      setUsers(userData);
    } catch {
      setError('데이터를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === 'authenticated' && session?.user?.role === 'ADMIN') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchData();
    }
  }, [status, session, fetchData]);

  const handleApprove = async (req: Request) => {
    const isEtc = req.category?.categoryName === '기타';
    const etcData = etcEdits[req.id] || { activityType: 'OFFICIAL', hours: 0.5 };

    if (isEtc) {
      if (!etcData.activityType || !etcData.hours || etcData.hours < 0.5) {
        setError('기타 카테고리의 활동 유형과 시간을 입력해주세요.');
        return;
      }
    }

    setActionLoading(req.id);
    setError('');

    try {
      const body: { activityType?: 'OFFICIAL' | 'AUTONOMOUS'; appliedHours?: number } = {};
      if (isEtc) {
        body.activityType = etcData.activityType;
        body.appliedHours = etcData.hours;
      }

      const res = await fetch(`/api/requests/${req.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to approve');
      }

      const updatedReq = await res.json();
      setRequests((prev) =>
        prev.map((r) => (r.id === req.id ? { ...updatedReq, user: r.user } : r))
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '승인 중 오류가 발생했습니다.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async () => {
    if (!rejectModal || !rejectReason.trim()) return;
    setActionLoading(rejectModal.id);
    setError('');

    try {
      const res = await fetch(`/api/requests/${rejectModal.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rejectedReason: rejectReason }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to reject');
      }

      const updatedReq = await res.json();
      setRequests((prev) =>
        prev.map((r) => (r.id === rejectModal.id ? { ...updatedReq, user: r.user } : r))
      );
      setRejectModal(null);
      setRejectReason('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '반려 중 오류가 발생했습니다.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('정말로 이 활동 내역을 삭제하시겠습니까? (복구할 수 없습니다)')) return;
    setActionLoading(id);
    setError('');

    try {
      const res = await fetch(`/api/requests/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete');
      }
      setRequests((prev) => prev.filter((r) => r.id !== id));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '삭제 중 오류가 발생했습니다.');
    } finally {
      setActionLoading(null);
    }
  };

  const toggleExpand = (id: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleUserExpand = (userId: number) => {
    setExpandedUsers((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const updateEtcEdit = (reqId: number, field: 'activityType' | 'hours', value: 'OFFICIAL' | 'AUTONOMOUS' | number) => {
    setEtcEdits((prev) => {
      const existing = prev[reqId] || { activityType: 'OFFICIAL', hours: 1 };
      return {
        ...prev,
        [reqId]: {
          ...existing,
          [field]: value,
        } as { activityType: 'OFFICIAL' | 'AUTONOMOUS'; hours: number },
      };
    });
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (status === 'loading' || loading) {
    return (
      <>
        <Navbar />
        <div className="container">
          <div className="page-header">
            <h1 className="page-title">승인 대기열</h1>
          </div>
          {[1, 2, 3].map((i) => (
            <div key={i} className="card skeleton-card" style={{ marginBottom: '1rem' }}>
              <div className="skeleton skeleton-text" />
              <div className="skeleton skeleton-text" style={{ width: '70%' }} />
              <div className="skeleton skeleton-text" style={{ width: '40%' }} />
            </div>
          ))}
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="container">
        <div className="page-header">
          <h1 className="page-title">승인 대기열</h1>
          <button className="btn btn-outline" onClick={() => { setLoading(true); fetchData(); }}>
            🔄 새로고침
          </button>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
          {(['PENDING', 'APPROVED', 'REJECTED'] as const).map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`btn ${filterStatus === s ? 'btn-primary' : 'btn-outline'}`}
            >
              {s === 'PENDING' ? '대기중' : s === 'APPROVED' ? '승인됨' : '반려됨'}
            </button>
          ))}
        </div>

        {error && (
          <div className="alert alert-error">
            <span className="alert-icon">⚠️</span>
            {error}
            <button className="alert-dismiss" onClick={() => setError('')}>✕</button>
          </div>
        )}

        {(filterStatus !== 'APPROVED' && requests.filter(r => r.status === filterStatus).length === 0) ? (
          <div className="empty-state">
            <div className="empty-state-icon">✨</div>
            <p className="empty-state-text">해당 상태의 요청이 없습니다</p>
          </div>
        ) : filterStatus === 'PENDING' ? (
          /* ── PENDING: 플랫 카드 뷰 ── */
          <div className="admin-queue">
            {requests.filter(r => r.status === 'PENDING').map((req) => {
              const isEtc = req.category?.categoryName === '기타';
              const isThisLoading = actionLoading === req.id;

              return (
                <div key={req.id} className="admin-request-card" style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: 'var(--glass-radius)', padding: 'var(--space-lg)' }}>
                  <div className="admin-request-header">
                    <div className="admin-request-user">
                      <span className="admin-request-username">{req.user?.name}</span>
                      <span className="admin-request-email">{req.user?.email}</span>
                    </div>
                    <span className="request-date">{formatDate(req.createdAt)}</span>
                  </div>

                  <div className="admin-request-meta">
                    <span className="request-category">{req.category?.categoryName}</span>
                    {!isEtc && (
                      <>
                        <span className={`badge ${req.category?.activityType === 'OFFICIAL' ? 'badge-purple' : 'badge-teal'}`}>
                          {req.category?.activityType === 'OFFICIAL' ? '공식' : '자율'}
                        </span>
                        <span className="badge badge-outline">
                          {req.category?.assignedHours}시간
                        </span>
                      </>
                    )}
                    {isEtc && (
                      <span className="badge badge-warning">기타 (시간 배정 필요)</span>
                    )}
                  </div>

                  <div className="admin-request-description">
                    <p>
                      {expanded.has(req.id) || req.description.length <= 150
                        ? req.description
                        : `${req.description.slice(0, 150)}...`}
                    </p>
                    {req.description.length > 150 && (
                      <button className="btn-text" onClick={() => toggleExpand(req.id)}>
                        {expanded.has(req.id) ? '접기' : '더보기'}
                      </button>
                    )}
                  </div>

                  {req.evidenceFileUrl && (
                    <div className="admin-request-evidence">
                      <a href={req.evidenceFileUrl} target="_blank" rel="noopener noreferrer" className="evidence-link">
                        📎 증빙 파일 보기
                      </a>
                    </div>
                  )}

                  {isEtc && (
                    <div className="etc-edit-section">
                      <div className="etc-edit-row">
                        <div className="form-group form-group-inline">
                          <label className="form-label">활동 유형</label>
                          <select
                            className="form-select"
                            value={etcEdits[req.id]?.activityType || 'OFFICIAL'}
                            onChange={(e) => updateEtcEdit(req.id, 'activityType', e.target.value as 'OFFICIAL' | 'AUTONOMOUS')}
                            disabled={isThisLoading}
                          >
                            <option value="OFFICIAL">공식</option>
                            <option value="AUTONOMOUS">자율</option>
                          </select>
                        </div>
                        <div className="form-group form-group-inline">
                          <label className="form-label">배정 시간</label>
                          <input
                            type="number"
                            className="form-input"
                            min={0.5}
                            step={0.5}
                            value={etcEdits[req.id]?.hours || 0.5}
                            onChange={(e) => updateEtcEdit(req.id, 'hours', parseFloat(e.target.value))}
                            disabled={isThisLoading}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="admin-request-actions">
                    <button
                      className="btn btn-success"
                      onClick={() => handleApprove(req)}
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
                      onClick={() => { setRejectModal(req); setRejectReason(''); }}
                      disabled={isThisLoading}
                    >
                      반려
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* ── APPROVED / REJECTED: 사용자별 그룹 뷰 ── */
          <div className="user-grouped-view">
            {(() => {
              const filtered = requests.filter(r => r.status === filterStatus);
              let groups: { user: User; requests: Request[] }[] = [];

              if (filterStatus === 'APPROVED') {
                groups = users.map(u => {
                  const userRequests = filtered.filter(r => r.user?.id === u.id);
                  return {
                    user: { id: u.id, name: u.name, email: u.email },
                    requests: userRequests
                  };
                });
              } else {
                const grouped: Record<number, { user: User; requests: Request[] }> = {};
                for (const req of filtered) {
                  const uid = req.user?.id;
                  if (!uid) continue;
                  if (!grouped[uid]) {
                    grouped[uid] = { user: req.user, requests: [] };
                  }
                  grouped[uid].requests.push(req);
                }
                groups = Object.values(grouped);
              }

              groups.sort((a, b) => a.user.name.localeCompare(b.user.name));

              return groups.map((group) => {
                const totalHours = group.requests.reduce((sum, r) => sum + (r.appliedHours || 0), 0);
                const officialHours = group.requests
                  .filter(r => r.activityType === 'OFFICIAL')
                  .reduce((sum, r) => sum + (r.appliedHours || 0), 0);
                const autonomousHours = group.requests
                  .filter(r => r.activityType === 'AUTONOMOUS')
                  .reduce((sum, r) => sum + (r.appliedHours || 0), 0);
                const isGroupExpanded = expandedUsers.has(group.user.id);

                return (
                  <div key={group.user.id} className="user-group-section">
                    <button
                      className="user-group-header"
                      onClick={() => toggleUserExpand(group.user.id)}
                    >
                      <div className="user-group-left">
                        <span className="user-group-arrow" style={{ transform: isGroupExpanded ? 'rotate(90deg)' : 'rotate(0)' }}>▶</span>
                        <div className="user-group-info">
                          <span className="user-group-name">{group.user.name}</span>
                          <span className="user-group-email">{group.user.email}</span>
                        </div>
                      </div>
                      <div className="user-group-right">
                        {filterStatus === 'APPROVED' && (
                          <div className="user-group-hours">
                            {officialHours > 0 && (
                              <span className="badge badge-purple">{officialHours}h 공식</span>
                            )}
                            {autonomousHours > 0 && (
                              <span className="badge badge-teal">{autonomousHours}h 자율</span>
                            )}
                            <span className="user-group-total">{totalHours}시간</span>
                          </div>
                        )}
                        <span className="user-group-count">{group.requests.length}건</span>
                      </div>
                    </button>

                    {isGroupExpanded && (
                      <div className="user-group-body">
                        {group.requests.length === 0 ? (
                          <p className="empty-state-text" style={{ fontSize: '0.9rem', color: 'var(--text-muted)', margin: 0, textAlign: 'center', padding: 'var(--space-md)' }}>
                            {filterStatus === 'APPROVED' ? '승인된 활동 내역이 없습니다.' : '반려된 활동 내역이 없습니다.'}
                          </p>
                        ) : (
                          group.requests.map((req) => {
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
                                  <span className="request-date">{formatDate(req.createdAt)}</span>
                                </div>
                                <p className="user-group-item-desc">
                                  {expanded.has(req.id) || req.description.length <= 120
                                    ? req.description
                                    : `${req.description.slice(0, 120)}...`}
                                  {req.description.length > 120 && (
                                    <button className="btn-text" onClick={() => toggleExpand(req.id)} style={{ marginLeft: '4px' }}>
                                      {expanded.has(req.id) ? '접기' : '더보기'}
                                    </button>
                                  )}
                                </p>
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
                                    onClick={() => handleDelete(req.id)}
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
                    )}
                  </div>
                );
              });
            })()}
          </div>
        )}
      </div>

      {/* Reject Modal */}
      {rejectModal && (
        <div className="modal-overlay" onClick={() => setRejectModal(null)}>
          <div className="modal glass-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">요청 반려</h3>
              <button className="modal-close" onClick={() => setRejectModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              <p className="modal-info">
                <strong>{rejectModal.user?.name}</strong>님의 <strong>{rejectModal.category?.categoryName}</strong> 활동을 반려합니다.
              </p>
              <div className="form-group">
                <label className="form-label">반려 사유 (필수)</label>
                <textarea
                  className="form-textarea"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="반려 사유를 입력해주세요"
                  rows={3}
                  required
                />
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-outline"
                onClick={() => setRejectModal(null)}
                disabled={actionLoading === rejectModal.id}
              >
                취소
              </button>
              <button
                className="btn btn-danger"
                onClick={handleReject}
                disabled={!rejectReason.trim() || actionLoading === rejectModal.id}
              >
                {actionLoading === rejectModal.id ? (
                  <span className="btn-loading">
                    <span className="loading-spinner-sm" />
                    처리 중...
                  </span>
                ) : (
                  '반려 확인'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
