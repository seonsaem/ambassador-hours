'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import MetricCard from '@/components/MetricCard';
import Modal from '@/components/Modal';
import CustomDropdown from '@/components/CustomDropdown';
import DashboardRequestCard from '@/components/DashboardRequestCard';
import NoticeBoard from '@/components/NoticeBoard';
import StatusBadge from '@/components/StatusBadge';
import DeleteVerificationModal from '@/components/DeleteVerificationModal';
import type { Category, User, Request, GroupedRequest } from '@/types';

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Metric card personal breakdown & request filter state
  const [selectedMetric, setSelectedMetric] = useState<'OFFICIAL' | 'AUTONOMOUS' | 'ALL' | null>(null);
  const [metricStatusFilter, setMetricStatusFilter] = useState<'ALL' | 'APPROVED' | 'PENDING' | 'REJECTED'>('ALL');

  // Expanded descriptions
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [expandedReasons, setExpandedReasons] = useState<Set<number>>(new Set());

  const toggleExpandReason = (id: number) => {
    setExpandedReasons((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Edit modal state
  const [editModal, setEditModal] = useState<Request | null>(null);
  const [editCategoryId, setEditCategoryId] = useState<number | ''>('');
  const [editDescription, setEditDescription] = useState('');
  const [editFile, setEditFile] = useState<File | null>(null);
  const [editCustomHours, setEditCustomHours] = useState<number>(1);
  const [editActivityDate, setEditActivityDate] = useState('');
  const [editUserIds, setEditUserIds] = useState<number[]>([]);
  const [editLoading, setEditLoading] = useState(false);
  const [deleteRequest, setDeleteRequest] = useState<Request | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeUsers, setActiveUsers] = useState<User[]>([]);

  useEffect(() => {
    const fetchActiveUsers = async () => {
      try {
        const res = await fetch('/api/users/active');
        if (res.ok) {
          const data = await res.json();
          setActiveUsers(data);
        }
      } catch (err) {
        console.error('Failed to fetch active users', err);
      }
    };
    if (status === 'authenticated') {
      fetchActiveUsers();
    }
  }, [status]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await fetch('/api/categories?active=true');
        if (res.ok) {
          const data = await res.json();
          setCategories(data);
        }
      } catch (err) {
        console.error('Failed to fetch categories', err);
      }
    };
    if (status === 'authenticated') {
      fetchCategories();
    }
  }, [status]);

  const toggleExpand = (id: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  const fetchRequests = useCallback(async () => {
    try {
      const res = await fetch('/api/requests');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setRequests(data);
    } catch {
      setError('데이터를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === 'authenticated') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchRequests();
    }
  }, [status, fetchRequests]);

  const currentUserId = Number(session?.user?.id);

  const officialHours = requests
    .filter((r) => r.status === 'APPROVED' && r.activityType === 'OFFICIAL' && r.userId === currentUserId)
    .reduce((sum, r) => sum + (r.appliedHours || 0), 0);

  const autonomousHours = requests
    .filter((r) => r.status === 'APPROVED' && r.activityType === 'AUTONOMOUS' && r.userId === currentUserId)
    .reduce((sum, r) => sum + (r.appliedHours || 0), 0);

  const totalHours = officialHours + autonomousHours;

  const displayRequests = requests.filter((req) => {
    const currentUserId = Number(session?.user?.id);
    return req.createdById === currentUserId || req.userId === currentUserId;
  });

  const groupedRequests: GroupedRequest[] = [];
  const groups: Record<string, GroupedRequest> = {};

  for (const req of displayRequests) {
    if (req.bulkLabel) {
      const key = `bulk-${req.bulkLabel}-${req.category?.id}-${req.description}`;
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
          status: req.status,
          rejectedReason: req.rejectedReason,
          users: [],
          requests: []
        };
        groupedRequests.push(groups[key]);
      }
      const mappedUser = req.user;
      if (mappedUser) {
        // Avoid duplicate users in rendering
        if (!groups[key].users.some(u => u.id === mappedUser.id)) {
          groups[key].users.push({
            id: mappedUser.id,
            name: mappedUser.name,
            email: mappedUser.email
          });
        }
      }
      groups[key].requests.push(req);
    } else {
      const key = `single-${req.id}`;
      const mappedUser = req.user;
      groupedRequests.push({
        id: key,
        bulkLabel: null,
        category: req.category,
        activityType: req.activityType,
        appliedHours: req.appliedHours,
        description: req.description,
        evidenceFileUrl: req.evidenceFileUrl,
        createdAt: req.createdAt,
        activityDate: req.activityDate,
        status: req.status,
        rejectedReason: req.rejectedReason,
        users: mappedUser ? [{
          id: mappedUser.id,
          name: mappedUser.name,
          email: mappedUser.email
        }] : [],
        requests: [req]
      });
    }
  }



  const openEditModal = (request: Request) => {
    setEditModal(request);
    setEditCategoryId(request.category?.id || '');
    setEditDescription(request.description);
    setEditFile(null);
    setEditCustomHours(request.appliedHours || 1);
    setEditActivityDate(request.activityDate ? request.activityDate.slice(0, 10) : new Date(request.createdAt).toISOString().slice(0, 10));

    const bulkUserIds = request.bulkLabel
      ? requests.filter(r =>
          r.bulkLabel === request.bulkLabel &&
          r.category?.id === request.category?.id &&
          r.description === request.description &&
          r.userId !== undefined
        ).map(r => r.userId as number)
      : (request.userId ? [request.userId] : []);
    setEditUserIds(bulkUserIds);
  };

  const handleUserCheckToggle = (userId: number) => {
    setEditUserIds((prev) => {
      if (prev.includes(userId)) {
        return prev.filter(id => id !== userId);
      } else {
        return [...prev, userId];
      }
    });
  };

  const handleEdit = async () => {
    if (!editModal) return;
    setEditLoading(true);
    setError('');

    try {
      let evidenceFileUrl = editModal.evidenceFileUrl;

      if (editFile) {
        const formData = new FormData();
        formData.append('file', editFile);
        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });
        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          evidenceFileUrl = uploadData.url;
        }
      }

      const res = await fetch(`/api/requests/${editModal.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryId: Number(editCategoryId),
          description: editDescription,
          evidenceFileUrl,
          appliedHours: Number(editCustomHours),
          activityDate: editActivityDate,
          userIds: editUserIds,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to edit');
      }

      setEditModal(null);
      await fetchRequests();
    } catch (err) {
      setError(err instanceof Error ? err.message : '수정 중 오류가 발생했습니다.');
    } finally {
      setEditLoading(false);
    }
  };

  const handleDeleteClick = (id: number) => {
    const req = requests.find((r) => r.id === id);
    if (req) {
      setDeleteRequest(req);
    }
  };

  const handleDeleteVerification = async (id: number) => {
    setDeleteLoading(true);
    setError('');

    try {
      const res = await fetch(`/api/requests/${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete');
      }

      await fetchRequests();
      setDeleteRequest(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '삭제 중 오류가 발생했습니다.');
    } finally {
      setDeleteLoading(false);
    }
  };



  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}.${mm}.${dd}`;
  };

  const getActivityBadge = (type: string | null) => {
    if (!type) return null;
    return type === 'OFFICIAL' ? (
      <span className="badge badge-purple">공식</span>
    ) : (
      <span className="badge badge-teal">자율</span>
    );
  };

  if (status === 'loading' || loading) {
    return (
      <>
        <Navbar />
        <div className="container">
          <div className="section-header flex justify-between items-center mb-xl">
            <div>
              <h1>대시보드</h1>
              <p>활동 내역을 불러오는 중입니다…</p>
            </div>
          </div>
          <div className="grid-metrics">
            {[1, 2, 3].map((i) => (
              <div key={i} className="metric-card skeleton-card">
                <div className="skeleton skeleton-text" />
                <div className="skeleton skeleton-heading" />
              </div>
            ))}
          </div>
          <div className="section">
            <div className="skeleton skeleton-heading" style={{ width: '150px', marginBottom: '1rem' }} />
            {[1, 2, 3].map((i) => (
              <div key={i} className="request-card skeleton-card" style={{ marginBottom: '0.75rem', height: '120px' }}>
                <div className="skeleton skeleton-text" />
                <div className="skeleton skeleton-text" style={{ width: '60%' }} />
              </div>
            ))}
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="container">
        <div className="section-header flex justify-between items-center mb-xl">
          <div>
            <h1>대시보드</h1>
            <p>홍보대사 활동 내역과 승인된 시간을 관리합니다.</p>
          </div>
          <Link href="/dashboard/new" className="btn btn-primary">
            + 활동 신청
          </Link>
        </div>

        {error && (
          <div className="alert alert-error">
            <span className="alert-icon">⚠️</span>
            {error}
          </div>
        )}

        {/* Metric Cards */}
        {(() => {
          const myRequests = requests.filter((r) => r.userId === currentUserId);
          const myOfficialRequests = myRequests.filter((r) => r.activityType === 'OFFICIAL');
          const myAutonomousRequests = myRequests.filter((r) => r.activityType === 'AUTONOMOUS');

          const handleMetricToggle = (metric: 'OFFICIAL' | 'AUTONOMOUS' | 'ALL') => {
            setSelectedMetric((prev) => (prev === metric ? null : metric));
            setMetricStatusFilter('ALL');
          };

          const activeRequestsForMetric =
            selectedMetric === 'OFFICIAL'
              ? myOfficialRequests
              : selectedMetric === 'AUTONOMOUS'
              ? myAutonomousRequests
              : myRequests;

          const filteredPersonalRequests = activeRequestsForMetric.filter((r) =>
            metricStatusFilter === 'ALL' ? true : r.status === metricStatusFilter
          );

          // Category breakdown for APPROVED personal requests in the selected metric
          const categoryMap = new Map<
            number,
            { categoryId: number; categoryName: string; activityType: string; hours: number; count: number }
          >();
          activeRequestsForMetric
            .filter((r) => r.status === 'APPROVED')
            .forEach((r) => {
              const catId = r.category?.id ?? 0;
              const existing = categoryMap.get(catId);
              if (existing) {
                existing.hours += r.appliedHours || 0;
                existing.count += 1;
              } else {
                categoryMap.set(catId, {
                  categoryId: catId,
                  categoryName: r.category?.categoryName || '기타',
                  activityType: r.activityType || 'OFFICIAL',
                  hours: r.appliedHours || 0,
                  count: 1,
                });
              }
            });
          const myCategoryBreakdown = Array.from(categoryMap.values()).sort((a, b) => b.hours - a.hours);
          const maxCatHours = myCategoryBreakdown.length > 0 ? Math.max(...myCategoryBreakdown.map((b) => b.hours)) : 1;

          const panelTitle =
            selectedMetric === 'OFFICIAL'
              ? '내 공식 활동 신청 내역'
              : selectedMetric === 'AUTONOMOUS'
              ? '내 자율 활동 신청 내역'
              : '내 전체 활동 신청 내역';

          return (
            <>
              <div className="grid-metrics">
                <MetricCard
                  title="공식 활동 시간"
                  value={officialHours}
                  gradient="purple"
                  count={myOfficialRequests.length}
                  isActive={selectedMetric === 'OFFICIAL'}
                  onClick={() => handleMetricToggle('OFFICIAL')}
                />
                <MetricCard
                  title="자율 활동 시간"
                  value={autonomousHours}
                  gradient="teal"
                  count={myAutonomousRequests.length}
                  isActive={selectedMetric === 'AUTONOMOUS'}
                  onClick={() => handleMetricToggle('AUTONOMOUS')}
                />
                <MetricCard
                  title="총 활동 시간"
                  value={totalHours}
                  gradient="gold"
                  count={myRequests.length}
                  isActive={selectedMetric === 'ALL'}
                  onClick={() => handleMetricToggle('ALL')}
                />
              </div>

              {selectedMetric && (
                <div className="my-activity-panel">
                  <div className="my-activity-panel-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                      <h3 className="card-title" style={{ marginBottom: 0, fontSize: '1.05rem' }}>
                        {panelTitle}
                      </h3>
                      <span className="badge badge-outline">
                        총 {activeRequestsForMetric.length}건
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <div className="category-filter-pills">
                        {(
                          [
                            { key: 'ALL', label: `전체 (${activeRequestsForMetric.length})` },
                            {
                              key: 'APPROVED',
                              label: `승인됨 (${activeRequestsForMetric.filter((r) => r.status === 'APPROVED').length})`,
                            },
                            {
                              key: 'PENDING',
                              label: `대기중 (${activeRequestsForMetric.filter((r) => r.status === 'PENDING').length})`,
                            },
                            {
                              key: 'REJECTED',
                              label: `반려됨 (${activeRequestsForMetric.filter((r) => r.status === 'REJECTED').length})`,
                            },
                          ] as const
                        ).map((tab) => (
                          <button
                            key={tab.key}
                            type="button"
                            onClick={() => setMetricStatusFilter(tab.key)}
                            className={`category-filter-pill ${metricStatusFilter === tab.key ? 'is-active' : ''}`}
                          >
                            {tab.label}
                          </button>
                        ))}
                      </div>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => setSelectedMetric(null)}
                        aria-label="상세 내역 닫기"
                      >
                        ✕ 닫기
                      </button>
                    </div>
                  </div>

                  {/* Category Breakdown Bars (for approved hours) */}
                  {myCategoryBreakdown.length > 0 && (
                    <div
                      style={{
                        background: 'var(--bg-primary)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-md)',
                        padding: '14px 18px',
                        marginBottom: '16px',
                      }}
                    >
                      <div className="user-breakdown-title" style={{ marginBottom: '10px' }}>
                        📊 카테고리별 승인 시간 요약
                      </div>
                      <div className="user-breakdown-list">
                        {myCategoryBreakdown.map((cat) => (
                          <div key={cat.categoryId} className="user-breakdown-row">
                            <span className="user-breakdown-label" title={cat.categoryName}>
                              {cat.categoryName}
                            </span>
                            <span
                              className={`badge ${cat.activityType === 'OFFICIAL' ? 'badge-purple' : 'badge-teal'}`}
                              style={{ fontSize: '0.68rem', flexShrink: 0, minWidth: '38px', justifyContent: 'center' }}
                            >
                              {cat.activityType === 'OFFICIAL' ? '공식' : '자율'}
                            </span>
                            <div className="user-breakdown-track">
                              <div
                                className={`user-breakdown-fill ${
                                  cat.activityType === 'OFFICIAL' ? 'fill-official' : 'fill-autonomous'
                                }`}
                                style={{ width: `${(cat.hours / maxCatHours) * 100}%` }}
                              />
                            </div>
                            <span className="user-breakdown-hours">{cat.hours.toFixed(1)}h</span>
                            <span className="user-breakdown-count">({cat.count}건)</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Personal Request List */}
                  {filteredPersonalRequests.length === 0 ? (
                    <div
                      style={{
                        padding: '28px 16px',
                        textAlign: 'center',
                        color: 'var(--text-muted)',
                        fontSize: '0.9rem',
                        background: 'var(--bg-primary)',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-subtle)',
                      }}
                    >
                      해당 조건의 본인 활동 신청 내역이 없습니다.
                    </div>
                  ) : (
                    <div className="my-activity-item-list">
                      {filteredPersonalRequests.map((req) => (
                        <div key={req.id} className="my-activity-item-row">
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: '1 1 260px', minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                              <StatusBadge status={req.status} />
                              {getActivityBadge(req.activityType)}
                              {req.category?.department && (
                                <span className="badge badge-gold" style={{ fontSize: '0.7rem' }}>
                                  {req.category.department}
                                </span>
                              )}
                              <span
                                style={{
                                  fontWeight: 700,
                                  fontSize: '0.92rem',
                                  color: 'var(--text-primary)',
                                  wordBreak: 'keep-all',
                                }}
                              >
                                {req.category?.categoryName}
                              </span>
                            </div>
                            <div
                              style={{
                                fontSize: '0.86rem',
                                color: 'var(--text-secondary)',
                                wordBreak: 'break-all',
                                whiteSpace: 'pre-wrap',
                              }}
                            >
                              {req.description}
                            </div>
                            {req.status === 'REJECTED' && req.rejectedReason && (
                              <div
                                style={{
                                  fontSize: '0.8rem',
                                  color: 'var(--danger-light)',
                                  background: 'var(--danger-bg)',
                                  padding: '4px 8px',
                                  borderRadius: '6px',
                                  borderLeft: '2px solid var(--danger)',
                                  marginTop: '2px',
                                }}
                              >
                                <strong>반려 사유:</strong> {req.rejectedReason}
                              </div>
                            )}
                          </div>

                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '12px',
                              flexShrink: 0,
                              marginLeft: 'auto',
                            }}
                          >
                            {req.evidenceFileUrl && (
                              <a
                                href={req.evidenceFileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="evidence-link"
                              >
                                📎 증빙
                              </a>
                            )}
                            <div style={{ textAlign: 'right' }}>
                              <div
                                style={{
                                  fontFamily: 'var(--font-display)',
                                  fontWeight: 800,
                                  fontSize: '0.98rem',
                                  color: 'var(--primary)',
                                  fontVariantNumeric: 'tabular-nums',
                                }}
                              >
                                {req.appliedHours}시간
                              </div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                {formatDate(req.activityDate || req.createdAt)}
                              </div>
                            </div>

                            {(req.status === 'PENDING' || req.status === 'REJECTED') && (
                              <div style={{ display: 'flex', gap: '4px' }}>
                                <button
                                  type="button"
                                  className="btn btn-outline btn-sm"
                                  style={{ padding: '4px 9px', fontSize: '0.75rem' }}
                                  onClick={() => openEditModal(req)}
                                >
                                  수정
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-outline-danger btn-sm"
                                  style={{ padding: '4px 9px', fontSize: '0.75rem' }}
                                  onClick={() => handleDeleteClick(req.id)}
                                >
                                  삭제
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          );
        })()}

        {/* Notice Board */}
        <NoticeBoard />

        {/* Request History */}
        <div className="section">
          <h2 className="section-title">활동 내역</h2>

          {groupedRequests.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📋</div>
              <p className="empty-state-text">아직 활동 신청 내역이 없습니다</p>
              <Link href="/dashboard/new" className="btn btn-outline">
                첫 활동 신청하기
              </Link>
            </div>
          ) : (
            <div className="request-list">
              {groupedRequests.map((group, index) => {
                const canModify =
                  session?.user?.role === 'ADMIN' ||
                  group.requests.every(
                    (r) =>
                      r.createdById === Number(session?.user?.id) ||
                      r.userId === Number(session?.user?.id)
                  );

                return (
                  <DashboardRequestCard
                    key={group.id}
                    group={group}
                    index={index}
                    canModify={canModify}
                    expanded={expanded}
                    toggleExpand={toggleExpand}
                    expandedReasons={expandedReasons}
                    toggleExpandReason={toggleExpandReason}
                    openEditModal={openEditModal}
                    handleDeleteClick={handleDeleteClick}
                    getActivityBadge={getActivityBadge}
                    formatDate={formatDate}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>



      {/* Edit Modal */}
      <Modal
        isOpen={!!editModal}
        onClose={() => setEditModal(null)}
        title="활동 수정"
      >
        {editModal && (
          <>
            {/* Category Select */}
            <div className="form-group">
              <label className="form-label">카테고리</label>
              <CustomDropdown
                categories={categories}
                categoryId={editCategoryId as number}
                setCategoryId={setEditCategoryId}
                disabled={editLoading}
              />
            </div>

            {/* Selected category info (applied hours) */}
            {(() => {
              const selectedCategory = categories.find((c) => c.id === editCategoryId);
              const isEtc = selectedCategory?.assignedHours === 0;
              if (!selectedCategory) return null;

              return (
                <div className="category-info" style={{ marginTop: 'var(--space-sm)', marginBottom: 'var(--space-md)' }}>
                  {isEtc ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                      <div className="alert alert-info" style={{ marginBottom: 0, wordBreak: 'keep-all' }}>
                        <span className="alert-icon">ℹ️</span>
                        시간 변동(가변) 카테고리입니다. 실제 활동한 시간을 입력해 주세요.
                        {selectedCategory.maxHours !== null && selectedCategory.maxHours !== undefined && (
                          <>
                            {' '}
                            <strong>(최대 {selectedCategory.maxHours}시간까지 신청 가능)</strong>
                          </>
                        )}
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">신청 시간</label>
                        <input
                          type="number"
                          className="form-input"
                          min={0.5}
                          max={selectedCategory.maxHours !== null && selectedCategory.maxHours !== undefined ? selectedCategory.maxHours : undefined}
                          step={0.5}
                          value={editCustomHours}
                          onChange={(e) => setEditCustomHours(parseFloat(e.target.value) || 0)}
                          required
                          disabled={editLoading}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="category-info-badges">
                      <span className={`badge ${selectedCategory.activityType === 'OFFICIAL' ? 'badge-purple' : 'badge-teal'}`}>
                        {selectedCategory.activityType === 'OFFICIAL' ? '공식 활동' : '자율 활동'}
                      </span>
                      <span className="badge badge-outline">
                        {selectedCategory.assignedHours}시간 배정
                      </span>
                    </div>
                  )}
                </div>
              );
            })()}

            <div className="form-group">
              <label className="form-label">활동 날짜</label>
              <input
                type="date"
                className="form-input"
                value={editActivityDate}
                onChange={(e) => setEditActivityDate(e.target.value)}
                required
                disabled={editLoading}
              />
            </div>

            {/* 신청 인원 수정 (항상 노출하여 단일 신청을 통합 신청으로 승격하거나 벌크 수정할 수 있게 함) */}
            {editModal && (
              <div className="form-group">
                <label className="form-label">신청 인원 수정</label>
                <div className="bulk-user-grid" style={{ maxHeight: '280px' }}>
                  {activeUsers.map((u) => {
                    const isSelected = editUserIds.includes(u.id);
                    return (
                      <label
                        key={u.id}
                        className={`bulk-user-item ${isSelected ? 'bulk-user-selected' : ''}`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleUserCheckToggle(u.id)}
                          disabled={editLoading}
                          className="bulk-user-checkbox"
                        />
                        <div className="bulk-user-info">
                          <span className="bulk-user-name">
                            {u.name}
                          </span>
                          <span className="bulk-user-email">
                            {(u as User).email || ''}
                          </span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">활동 설명</label>
              <textarea
                className="form-textarea"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={4}
                required
                minLength={5}
                disabled={editLoading}
              />
            </div>

            <div className="form-group">
              <label className="form-label">증빙 파일 (선택) (이미지, PDF, 최대 5MB)</label>
              <input
                type="file"
                className="form-input"
                onChange={(e) => {
                  const selectedFile = e.target.files?.[0] || null;
                  if (selectedFile) {
                    if (selectedFile.size > 5 * 1024 * 1024) {
                      alert('파일 크기는 최대 5MB를 초과할 수 없습니다.');
                      e.target.value = '';
                      setEditFile(null);
                      return;
                    }
                    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
                    if (!allowedTypes.includes(selectedFile.type)) {
                      alert('허용되지 않는 파일 형식입니다. (JPEG, PNG, PDF만 가능)');
                      e.target.value = '';
                      setEditFile(null);
                      return;
                    }
                  }
                  setEditFile(selectedFile);
                }}
                disabled={editLoading}
              />
              {editModal.evidenceFileUrl && !editFile && (
                <span className="form-hint">기존 파일이 유지됩니다</span>
              )}
            </div>

            <div className="modal-footer" style={{ borderTop: 'none', padding: 'var(--space-md) 0 0 0' }}>
              <button
                className="btn btn-outline"
                onClick={() => setEditModal(null)}
                disabled={editLoading}
              >
                취소
              </button>
              <button
                className="btn btn-primary"
                onClick={handleEdit}
                disabled={editLoading || editDescription.length < 5 || !editCategoryId || !editActivityDate}
              >
                {editLoading ? (
                  <span className="btn-loading">
                    <span className="loading-spinner-sm" />
                    저장 중…
                  </span>
                ) : (
                  '저장'
                )}
              </button>
            </div>
          </>
        )}
      </Modal>

      {/* Delete Verification Modal */}
      <DeleteVerificationModal
        isOpen={!!deleteRequest}
        onClose={() => setDeleteRequest(null)}
        onVerify={() => deleteRequest && handleDeleteVerification(deleteRequest.id)}
        isLoading={deleteLoading}
        userName={deleteRequest?.user?.name}
        categoryName={deleteRequest?.category?.categoryName}
      />

      {/* Floating Action Button (mobile) */}
      <Link href="/dashboard/new" className="fab" aria-label="활동 신청">
        +
      </Link>
    </>
  );
}
