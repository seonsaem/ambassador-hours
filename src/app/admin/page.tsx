'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import AdminRequestCard from '@/components/AdminRequestCard';

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
  maxHours?: number | null;
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
  activityDate?: string | null;
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
  activityDate?: string | null;
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

  // Delete modal state
  const [deleteRequest, setDeleteRequest] = useState<Request | null>(null);



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
        const isReqEtc = req.category?.assignedHours === 0;
        const body: { activityType?: 'OFFICIAL' | 'AUTONOMOUS'; appliedHours?: number } = {};
        if (isReqEtc) {
          body.activityType = req.activityType as 'OFFICIAL' | 'AUTONOMOUS';
          body.appliedHours = req.appliedHours || 0.5;
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

  const handleConfirmDelete = async (id: number) => {
    setActionLoading(id);
    setError('');

    try {
      const res = await fetch(`/api/requests/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete');
      }
      setRequests((prev) => prev.filter((r) => r.id !== id));
      setDeleteRequest(null);
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









  const formatDateOnly = (dateStr: string) => {
    const date = new Date(dateStr);
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}.${mm}.${dd}`;
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
                      activityDate: req.activityDate,
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
                    activityDate: req.activityDate,
                    users: [req.user],
                    requests: [req]
                  });
                }
              }

              return groupedPending.map((group) => {
                return (
                  <AdminRequestCard
                    key={group.id}
                    group={group}
                    actionLoading={actionLoading}
                    expanded={expanded}
                    toggleExpand={toggleExpand}
                    expandedUsersList={expandedUsersList}
                    toggleUsersList={toggleUsersList}
                    handleApprove={handleApprove}
                    setRejectModal={setRejectModal}
                    setRejectReason={setRejectReason}
                    formatDateOnly={formatDateOnly}
                  />
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

              const collator = new Intl.Collator('ko', { numeric: true, sensitivity: 'base' });
              groups.sort((a, b) => collator.compare(a.user.name, b.user.name));

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
                                  <span className="request-date">활동일: {formatDateOnly(req.activityDate || req.createdAt)}</span>
                                </div>
                                <p className="user-group-item-desc" style={{ wordBreak: 'break-all', whiteSpace: 'pre-wrap', margin: '0 0 var(--space-sm) 0' }}>
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

      {/* Delete Confirmation Modal */}
      {deleteRequest && (
        <div className="modal-overlay" onClick={() => setDeleteRequest(null)}>
          <div className="modal glass-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">활동 내역 삭제</h3>
              <button className="modal-close" onClick={() => setDeleteRequest(null)} aria-label="모달 닫기">✕</button>
            </div>
            <div className="modal-body">
              <div className="modal-info">
                <p>
                  <strong>{deleteRequest.user.name}</strong>님의 <strong>{deleteRequest.category?.categoryName}</strong> 활동 내역을 정말로 삭제하시겠습니까?
                </p>
                <p style={{ color: 'var(--danger)', fontSize: '0.85rem', marginTop: '0.5rem' }}>
                  ⚠️ 삭제 후에는 복구할 수 없습니다.
                </p>
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-outline"
                onClick={() => setDeleteRequest(null)}
                disabled={actionLoading === deleteRequest.id}
              >
                취소
              </button>
              <button
                className="btn btn-danger"
                onClick={() => handleConfirmDelete(deleteRequest.id)}
                disabled={actionLoading === deleteRequest.id}
              >
                {actionLoading === deleteRequest.id ? (
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
      )}


    </>
  );
}
