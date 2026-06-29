'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import MetricCard from '@/components/MetricCard';
import StatusBadge from '@/components/StatusBadge';
import Modal from '@/components/Modal';

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
  category: Category;
  createdById?: number | null;
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Resubmit modal state
  const [resubmitModal, setResubmitModal] = useState<Request | null>(null);
  const [resubmitDesc, setResubmitDesc] = useState('');
  const [resubmitFile, setResubmitFile] = useState<File | null>(null);
  const [resubmitLoading, setResubmitLoading] = useState(false);

  // Expanded descriptions
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

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

  const officialHours = requests
    .filter((r) => r.status === 'APPROVED' && r.activityType === 'OFFICIAL')
    .reduce((sum, r) => sum + (r.appliedHours || 0), 0);

  const autonomousHours = requests
    .filter((r) => r.status === 'APPROVED' && r.activityType === 'AUTONOMOUS')
    .reduce((sum, r) => sum + (r.appliedHours || 0), 0);

  const totalHours = officialHours + autonomousHours;

  const displayRequests = requests.filter((req) => {
    if (req.createdById !== undefined && req.createdById !== null) {
      return req.createdById === Number(session?.user?.id);
    }
    return true;
  });

  const openResubmitModal = (request: Request) => {
    setResubmitModal(request);
    setResubmitDesc(request.description);
    setResubmitFile(null);
  };

  const handleResubmit = async () => {
    if (!resubmitModal) return;
    setResubmitLoading(true);

    try {
      let evidenceFileUrl = resubmitModal.evidenceFileUrl;

      if (resubmitFile) {
        const formData = new FormData();
        formData.append('file', resubmitFile);
        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });
        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          evidenceFileUrl = uploadData.url;
        }
      }

      const res = await fetch(`/api/requests/${resubmitModal.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: resubmitDesc,
          evidenceFileUrl,
        }),
      });

      if (!res.ok) throw new Error('Failed to resubmit');

      setResubmitModal(null);
      await fetchRequests();
    } catch {
      setError('재제출 중 오류가 발생했습니다.');
    } finally {
      setResubmitLoading(false);
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
              <p>활동 내역을 불러오는 중입니다...</p>
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
        <div className="grid-metrics">
          <MetricCard
            title="공식 활동 시간"
            value={officialHours}
            gradient="purple"
          />
          <MetricCard
            title="자율 활동 시간"
            value={autonomousHours}
            gradient="teal"
          />
          <MetricCard
            title="총 활동 시간"
            value={totalHours}
            gradient="gold"
          />
        </div>

        {/* Request History */}
        <div className="section">
          <h2 className="section-title">활동 내역</h2>

          {displayRequests.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📋</div>
              <p className="empty-state-text">아직 활동 신청 내역이 없습니다</p>
              <Link href="/dashboard/new" className="btn btn-outline">
                첫 활동 신청하기
              </Link>
            </div>
          ) : (
            <div className="request-list">
              {displayRequests.map((req, index) => (
                <div
                  key={req.id}
                  className={`request-card request-card-${req.status.toLowerCase()}`}
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <div className="request-card-header">
                    <div className="request-card-meta">
                      <span className="request-category">{req.category?.categoryName}</span>
                      {getActivityBadge(req.activityType)}
                      <StatusBadge status={req.status} />
                    </div>
                    <span className="request-date">{formatDate(req.createdAt)}</span>
                  </div>
                  <div className="request-description">
                    <p style={{ wordBreak: 'break-all', whiteSpace: 'pre-wrap', margin: 0 }}>
                      {expanded.has(req.id) || req.description.length <= 80
                        ? req.description
                        : `${req.description.slice(0, 80)}…`}
                    </p>
                    {req.description.length > 80 && (
                      <button
                        className="btn-text"
                        onClick={() => toggleExpand(req.id)}
                        style={{ padding: '2px 0', fontSize: '0.78rem', marginTop: '4px', display: 'inline-block' }}
                      >
                        {expanded.has(req.id) ? '접기' : '더보기'}
                      </button>
                    )}
                  </div>
                  <div className="request-card-footer">
                    {req.appliedHours !== null && (
                      <span className="request-hours">
                        {req.appliedHours}시간
                      </span>
                    )}

                    {req.status === 'REJECTED' && (
                      <div className="request-rejected-info">
                        {req.rejectedReason && (
                          <p className="rejected-reason">
                            <span className="rejected-reason-label">반려 사유:</span> {req.rejectedReason}
                          </p>
                        )}
                        <button
                          className="btn btn-outline btn-sm"
                          onClick={() => openResubmitModal(req)}
                        >
                          재제출
                        </button>
                      </div>
                    )}

                    {req.status === 'PENDING' && (
                      <span className="request-pending-text">심사중</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Resubmit Modal */}
      <Modal
        isOpen={!!resubmitModal}
        onClose={() => setResubmitModal(null)}
        title="활동 재제출"
      >
        {resubmitModal && (
          <>
            <div className="form-group">
              <label className="form-label">카테고리</label>
              <input
                type="text"
                className="form-input"
                value={resubmitModal.category?.categoryName || ''}
                disabled
              />
            </div>
            <div className="form-group">
              <label className="form-label">활동 설명</label>
              <textarea
                className="form-textarea"
                value={resubmitDesc}
                onChange={(e) => setResubmitDesc(e.target.value)}
                rows={4}
                required
                minLength={5}
              />
            </div>
            <div className="form-group">
              <label className="form-label">증빙 파일 (선택)</label>
              <input
                type="file"
                className="form-input"
                onChange={(e) => setResubmitFile(e.target.files?.[0] || null)}
              />
              {resubmitModal.evidenceFileUrl && !resubmitFile && (
                <span className="form-hint">기존 파일이 유지됩니다</span>
              )}
            </div>
            <div className="modal-footer" style={{ borderTop: 'none', padding: 'var(--space-md) 0 0 0' }}>
              <button
                className="btn btn-outline"
                onClick={() => setResubmitModal(null)}
                disabled={resubmitLoading}
              >
                취소
              </button>
              <button
                className="btn btn-primary"
                onClick={handleResubmit}
                disabled={resubmitLoading || resubmitDesc.length < 5}
              >
                {resubmitLoading ? (
                  <span className="btn-loading">
                    <span className="loading-spinner-sm" />
                    제출 중...
                  </span>
                ) : (
                  '재제출'
                )}
              </button>
            </div>
          </>
        )}
      </Modal>

      {/* Floating Action Button (mobile) */}
      <Link href="/dashboard/new" className="fab" aria-label="활동 신청">
        +
      </Link>
    </>
  );
}
