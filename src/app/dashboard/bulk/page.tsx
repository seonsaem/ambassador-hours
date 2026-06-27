'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';

interface Category {
  id: number;
  categoryName: string;
  activityType: 'OFFICIAL' | 'AUTONOMOUS';
  assignedHours: number;
  isActive: boolean;
}

interface UserData {
  id: number;
  name: string;
  email: string;
}

export default function BulkCreatePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [categories, setCategories] = useState<Category[]>([]);
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form state
  const [categoryId, setCategoryId] = useState<number | ''>('');
  const [description, setDescription] = useState('');
  const [bulkLabel, setBulkLabel] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<Set<number>>(new Set());
  const [submitting, setSubmitting] = useState(false);

  // Confirm modal
  const [confirmModal, setConfirmModal] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  const fetchData = useCallback(async () => {
    try {
      const [catRes, userRes] = await Promise.all([
        fetch('/api/categories?active=true'),
        fetch('/api/users/active'),
      ]);
      if (!catRes.ok || !userRes.ok) throw new Error('Failed to fetch');
      const catData = await catRes.json();
      const userData = await userRes.json();
      setCategories(catData.filter((c: Category) => c.isActive && c.categoryName !== '기타'));
      setUsers(userData);
    } catch {
      setError('데이터를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchData();
    }
  }, [status, fetchData]);

  const selectedCategory = categories.find((c) => c.id === categoryId);

  const toggleUser = (userId: number) => {
    setSelectedUsers((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedUsers.size === users.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(users.map((u) => u.id)));
    }
  };

  const handleSubmit = async () => {
    setConfirmModal(false);
    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/requests/bulk-create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryId: Number(categoryId),
          description: description.trim(),
          userIds: Array.from(selectedUsers),
          bulkLabel: bulkLabel.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || '일괄 신청 실패');
      }

      const data = await res.json();
      setSuccess(`${data.createdCount}명에게 활동이 신청되었습니다.${data.skippedCount > 0 ? ` (${data.skippedCount}명 건너뜀)` : ''}`);

      // Reset form
      setCategoryId('');
      setDescription('');
      setBulkLabel('');
      setSelectedUsers(new Set());
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '일괄 신청 중 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit = categoryId !== '' && description.trim().length >= 5 && selectedUsers.size > 0 && !submitting;

  if (status === 'loading' || loading) {
    return (
      <>
        <Navbar />
        <div className="container">
          <div className="page-header">
            <h1 className="page-title">통합 신청</h1>
          </div>
          <div className="card skeleton-card" style={{ marginBottom: '1.5rem' }}>
            <div className="skeleton skeleton-heading" />
            <div className="skeleton skeleton-text" />
          </div>
          <div className="card skeleton-card">
            <div className="skeleton skeleton-heading" />
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="skeleton skeleton-text" style={{ marginBottom: '0.5rem' }} />
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
        <div className="page-header">
          <h1 className="page-title">통합 신청</h1>
        </div>

        {error && (
          <div className="alert alert-error">
            <span className="alert-icon">⚠️</span>
            {error}
            <button className="alert-dismiss" onClick={() => setError('')}>✕</button>
          </div>
        )}

        {success && (
          <div className="alert alert-success">
            <span className="alert-icon">✅</span>
            {success}
            <button className="alert-dismiss" onClick={() => setSuccess('')} aria-label="알림 닫기">✕</button>
          </div>
        )}

        {/* Activity Settings */}
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <h3 className="card-title">활동 정보</h3>

          <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">카테고리</label>
              <select
                className="form-select"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value ? Number(e.target.value) : '')}
                disabled={submitting}
              >
                <option value="">카테고리를 선택하세요</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.categoryName}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="bulkLabel" className="form-label">라벨 (선택)</label>
              <input
                type="text"
                id="bulkLabel"
                name="bulkLabel"
                className="form-input"
                placeholder="예: 6월 홍보행사…"
                value={bulkLabel}
                onChange={(e) => setBulkLabel(e.target.value)}
                disabled={submitting}
                autoComplete="off"
              />
            </div>
          </div>

          {selectedCategory && (
            <div className="category-info" style={{ marginBottom: 'var(--space-md)' }}>
              <div className="category-info-badges">
                <span className={`badge ${selectedCategory.activityType === 'OFFICIAL' ? 'badge-purple' : 'badge-teal'}`}>
                  {selectedCategory.activityType === 'OFFICIAL' ? '공식 활동' : '자율 활동'}
                </span>
                <span className="badge badge-outline">
                  {selectedCategory.assignedHours}시간 배정
                </span>
              </div>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="description" className="form-label">활동 설명</label>
            <textarea
              id="description"
              name="description"
              className="form-textarea"
              placeholder="활동 내용을 상세히 입력해주세요 (예: 공식 의전 행사 안내원 근무…) (최소 5자)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              disabled={submitting}
              autoComplete="off"
            />
            <span className="form-hint">{description.length}/5 자 이상</span>
          </div>
        </div>

        {/* User Selection */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
            <h3 className="card-title" style={{ margin: 0 }}>
              대상 사용자
              <span className="card-title-count">{users.length}명</span>
            </h3>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
                {selectedUsers.size}명 선택
              </span>
              <button
                className="btn btn-outline btn-sm"
                onClick={toggleAll}
                disabled={submitting}
              >
                {selectedUsers.size === users.length ? '전체 해제' : '전체 선택'}
              </button>
            </div>
          </div>

          <div className="bulk-user-grid">
            {users.map((user) => {
              const isSelected = selectedUsers.has(user.id);
              return (
                <label
                  key={user.id}
                  className={`bulk-user-item ${isSelected ? 'bulk-user-selected' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleUser(user.id)}
                    disabled={submitting}
                    className="bulk-user-checkbox"
                  />
                  <div className="bulk-user-info">
                    <span className="bulk-user-name">{user.name}</span>
                    <span className="bulk-user-email">{user.email}</span>
                  </div>
                </label>
              );
            })}
          </div>

          {/* Submit */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: 'var(--space-lg)', paddingTop: 'var(--space-md)', borderTop: '1px solid var(--glass-border)' }}>
            <button
              className="btn btn-outline"
              onClick={() => router.push('/admin')}
              disabled={submitting}
            >
              취소
            </button>
            <button
              className="btn btn-primary"
              onClick={() => setConfirmModal(true)}
              disabled={!canSubmit}
            >
              {submitting ? (
                <span className="btn-loading">
                  <span className="loading-spinner-sm" />
                  신청 중…
                </span>
              ) : (
                `${selectedUsers.size}명 일괄 신청`
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Confirm Modal */}
      {confirmModal && (
        <div className="modal-overlay" onClick={() => setConfirmModal(false)}>
          <div className="modal glass-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">일괄 신청 확인</h3>
              <button className="modal-close" onClick={() => setConfirmModal(false)} aria-label="모달 닫기">✕</button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>카테고리</span>
                  <strong>{selectedCategory?.categoryName}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>활동 유형</span>
                  <span className={`badge ${selectedCategory?.activityType === 'OFFICIAL' ? 'badge-purple' : 'badge-teal'}`}>
                    {selectedCategory?.activityType === 'OFFICIAL' ? '공식' : '자율'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>배정 시간</span>
                  <strong>{selectedCategory?.assignedHours}시간</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>대상 인원</span>
                  <strong>{selectedUsers.size}명</strong>
                </div>
                {bulkLabel.trim() && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>라벨</span>
                    <strong>{bulkLabel.trim()}</strong>
                  </div>
                )}
              </div>

            </div>
            <div className="modal-footer">
              <button
                className="btn btn-outline"
                onClick={() => setConfirmModal(false)}
              >
                취소
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSubmit}
              >
                일괄 신청 확인
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
