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
  bulkLabel: string | null;
  createdBy?: User | null;
}

interface GroupedRequest {
  id: string;
  bulkLabel: string | null;
  category: Category;
  activityType: 'OFFICIAL' | 'AUTONOMOUS' | null;
  appliedHours: number | null;
  description: string;
  evidenceFileUrl: string | null;
  createdAt: string;
  users: User[];
  requests: Request[];
  createdBy?: User | null;
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
  const [rejectModal, setRejectModal] = useState<GroupedRequest | null>(null);
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

  // Expanded users lists for bulk requests
  const [expandedUsersList, setExpandedUsersList] = useState<Set<string>>(new Set());

  const toggleUsersList = (groupId: string) => {
    setExpandedUsersList((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  };





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

  const handleApprove = async (group: GroupedRequest) => {
    const firstReqId = group.requests[0].id;
    setActionLoading(firstReqId);
    setError('');

    try {
      const promises = group.requests.map(async (req) => {
        const isReqEtc = req.category?.categoryName === '기타';
        const etcData = etcEdits[req.id] || { activityType: 'OFFICIAL', hours: 0.5 };
        const body: { activityType?: 'OFFICIAL' | 'AUTONOMOUS'; appliedHours?: number } = {};
        if (isReqEtc) {
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
        return res.json();
      });

      const updatedReqs = await Promise.all(promises);

      setRequests((prev) =>
        prev.map((r) => {
          const updated = updatedReqs.find((u) => u.id === r.id);
          return updated ? { ...updated, user: r.user } : r;
        })
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '승인 중 오류가 발생했습니다.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async () => {
    if (!rejectModal || !rejectReason.trim()) return;
    const firstReqId = rejectModal.requests[0].id;
    setActionLoading(firstReqId);
    setError('');

    try {
      const promises = rejectModal.requests.map(async (req) => {
        const res = await fetch(`/api/requests/${req.id}/reject`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rejectedReason: rejectReason }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Failed to reject');
        }
        return res.json();
      });

      const updatedReqs = await Promise.all(promises);

      setRequests((prev) =>
        prev.map((r) => {
          const updated = updatedReqs.find((u) => u.id === r.id);
          return updated ? { ...updated, user: r.user } : r;
        })
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
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button className="btn btn-outline" onClick={() => { setLoading(true); fetchData(); }}>
              🔄 새로고침
            </button>
          </div>
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
          /* ── PENDING: 플랫 카드 뷰 (통합 신청 그룹화) ── */
          <div className="admin-queue">
            {(() => {
              const pendingRequests = requests.filter(r => r.status === 'PENDING');
              const groupedPending: GroupedRequest[] = [];
              const groups: Record<string, GroupedRequest> = {};

              for (const req of pendingRequests) {
                if (req.bulkLabel) {
                  const key = `bulk-${req.bulkLabel}-${req.categoryId}-${req.description}`;
                  if (!groups[key]) {
                    groups[key] = {
                      id: key,
                      bulkLabel: req.bulkLabel,
                      category: req.category,
                      activityType: req.activityType,
                      appliedHours: req.appliedHours,
                      description: req.description,
                      evidenceFileUrl: req.evidenceFileUrl,
                      createdAt: req.createdAt,
                      createdBy: req.createdBy,
                      users: [],
                      requests: []
                    };
                    groupedPending.push(groups[key]);
                  }
                  groups[key].users.push(req.user);
                  groups[key].requests.push(req);
                } else {
                  const key = `single-${req.id}`;
                  groupedPending.push({
                    id: key,
                    bulkLabel: null,
                    category: req.category,
                    activityType: req.activityType,
                    appliedHours: req.appliedHours,
                    description: req.description,
                    evidenceFileUrl: req.evidenceFileUrl,
                    createdAt: req.createdAt,
                    users: [req.user],
                    requests: [req]
                  });
                }
              }

              return groupedPending.map((group) => {
                const isEtc = group.category?.categoryName === '기타';
                const isThisLoading = group.requests.some(r => actionLoading === r.id);

                return (
                  <div key={group.id} className="admin-request-card" style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: 'var(--glass-radius)', padding: 'var(--space-lg)' }}>
                    <div className="admin-request-header">
                      <div className="admin-request-user">
                        {group.bulkLabel ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%' }}>
                            <span className="badge badge-purple" style={{ alignSelf: 'flex-start', marginBottom: '2px' }}>통합 신청: {group.bulkLabel}</span>
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
                                {group.users.map((u) => (
                                  <div key={u.id} className="badge badge-outline" style={{ fontSize: '0.75rem', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', padding: '0.25rem 0.5rem' }}>
                                    <span style={{ fontWeight: 600 }}>{u.name}</span>
                                    <span style={{ fontSize: '0.65rem', opacity: 0.7 }}>{u.email}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ) : (
                          <>
                            <span className="admin-request-username">{group.users[0]?.name}</span>
                            <span className="admin-request-email">{group.users[0]?.email}</span>
                          </>
                        )}
                      </div>
                      <span className="request-date">{formatDate(group.createdAt)}</span>
                    </div>

                    <div className="admin-request-meta">
                      <span className="request-category">{group.category?.categoryName}</span>
                      {!isEtc && (
                        <>
                          <span className={`badge ${group.activityType === 'OFFICIAL' ? 'badge-purple' : 'badge-teal'}`}>
                            {group.activityType === 'OFFICIAL' ? '공식' : '자율'}
                          </span>
                          <span className="badge badge-outline">
                            {group.appliedHours}시간
                          </span>
                        </>
                      )}
                      {isEtc && (
                        <span className="badge badge-warning">기타 (시간 배정 필요)</span>
                      )}
                    </div>

                    <div className="admin-request-description">
                      <p>
                        {expanded.has(group.requests[0].id) || group.description.length <= 150
                          ? group.description
                          : `${group.description.slice(0, 150)}…`}
                      </p>
                      {group.description.length > 150 && (
                        <button className="btn-text" onClick={() => toggleExpand(group.requests[0].id)}>
                          {expanded.has(group.requests[0].id) ? '접기' : '더보기'}
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

                    {isEtc && (
                      <div className="etc-edit-section">
                        {group.requests.map((req) => (
                          <div key={req.id} className="etc-edit-row" style={{ marginBottom: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
                            <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>{req.user.name}:</span>
                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
                              <div className="form-group form-group-inline" style={{ marginBottom: 0 }}>
                                <label className="form-label">유형</label>
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
                              <div className="form-group form-group-inline" style={{ marginBottom: 0 }}>
                                <label className="form-label">시간</label>
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
                        ))}
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
              });
            })()}
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
                                    : `${req.description.slice(0, 120)}…`}
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
              <button className="modal-close" onClick={() => setRejectModal(null)} aria-label="모달 닫기">✕</button>
            </div>
            <div className="modal-body">
              <div className="modal-info">
                {rejectModal.bulkLabel ? (
                  <p>
                    <strong>{rejectModal.bulkLabel}</strong> 통합 신청 요청 (대상자: <strong>{rejectModal.users.map(u => u.name).join(', ')}</strong>)을 반려합니다.
                  </p>
                ) : (
                  <p>
                    <strong>{rejectModal.users[0]?.name}</strong>님의 <strong>{rejectModal.category?.categoryName}</strong> 활동을 반려합니다.
                  </p>
                )}
              </div>
              <div className="form-group">
                <label htmlFor="rejectReason" className="form-label">반려 사유 (필수)</label>
                <textarea
                  id="rejectReason"
                  className="form-textarea"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="반려 사유를 상세하게 입력해주세요…"
                  rows={3}
                  required
                />
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-outline"
                onClick={() => setRejectModal(null)}
                disabled={rejectModal.requests.some(r => actionLoading === r.id)}
              >
                취소
              </button>
              <button
                className="btn btn-danger"
                onClick={handleReject}
                disabled={!rejectReason.trim() || rejectModal.requests.some(r => actionLoading === r.id)}
              >
                {rejectModal.requests.some(r => actionLoading === r.id) ? (
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
      )}


    </>
  );
}
