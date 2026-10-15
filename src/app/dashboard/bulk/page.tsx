'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import CustomDropdown from '@/components/CustomDropdown';

interface Category {
  id: number;
  categoryName: string;
  activityType: 'OFFICIAL' | 'AUTONOMOUS';
  assignedHours: number;
  isActive: boolean;
  maxHours?: number | null;
}

interface UserData {
  id: number;
  name: string;
  email: string;
}

export default function BulkCreatePage() {
  const { status } = useSession();
  const router = useRouter();

  const [categories, setCategories] = useState<Category[]>([]);
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form state
  const [categoryId, setCategoryId] = useState<number | ''>('');
  const [description, setDescription] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<Set<number>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [customHours, setCustomHours] = useState<number | ''>('');
  const [activityDate, setActivityDate] = useState(new Date().toISOString().slice(0, 10));

  // File upload state
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState('');
  const [dragOver, setDragOver] = useState(false);

  // Verification modal
  const [verificationModal, setVerificationModal] = useState(false);

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
      const collator = new Intl.Collator('ko', { numeric: true, sensitivity: 'base' });
      const sortedUsers = userData.sort((a: UserData, b: UserData) => collator.compare(a.name, b.name));
      setCategories(catData.filter((c: Category) => c.isActive));
      setUsers(sortedUsers);
    } catch {
      setError('데이터를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === 'authenticated') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchData();
    }
  }, [status, fetchData]);

  const selectedCategory = categories.find((c) => c.id === categoryId);
  const isEtc = selectedCategory?.assignedHours === 0;

  const handleCategoryChange = (val: number | '') => {
    setCategoryId(val);
    setCustomHours('');
  };

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

  const handleFileChange = (selectedFile: File | null) => {
    if (selectedFile) {
      // Validate file size (5MB limit)
      if (selectedFile.size > 5 * 1024 * 1024) {
        setError('파일 크기는 최대 5MB를 초과할 수 없습니다.');
        const fileInput = document.getElementById('fileInput') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
        return;
      }
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
      if (!allowedTypes.includes(selectedFile.type)) {
        setError('허용되지 않는 파일 형식입니다. (JPEG, PNG, PDF만 가능)');
        const fileInput = document.getElementById('fileInput') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
        return;
      }

      setError('');
      setFile(selectedFile);
      setFileName(selectedFile.name);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    handleFileChange(droppedFile);
  };

  const handleSubmit = async () => {
    setVerificationModal(false);
    setSubmitting(true);
    setError('');
    setSuccess('');

    if (isEtc && selectedCategory?.maxHours !== null && selectedCategory?.maxHours !== undefined && Number(customHours) > selectedCategory.maxHours) {
      setError(`신청 시간은 최대 ${selectedCategory.maxHours}시간을 초과할 수 없습니다.`);
      setSubmitting(false);
      return;
    }

    try {
      let evidenceUrl: string | null = null;

      if (file) {
        const formData = new FormData();
        formData.append('file', file);
        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });
        if (!uploadRes.ok) {
          throw new Error('File upload failed');
        }
        const uploadData = await uploadRes.json();
        evidenceUrl = uploadData.url;
      }

      const res = await fetch('/api/requests/bulk-create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryId: Number(categoryId),
          description: description.trim(),
          userIds: Array.from(selectedUsers),
          appliedHours: isEtc ? Number(customHours) : undefined,
          evidenceFileUrl: evidenceUrl,
          activityDate,
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
      setCustomHours('');
      setSelectedUsers(new Set());
      setFile(null);
      setFileName('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '일괄 신청 중 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit = categoryId !== '' && 
    activityDate !== '' &&
    description.trim().length >= 5 && 
    selectedUsers.size > 0 && 
    (!isEtc || (customHours !== '' && !isNaN(Number(customHours)) && Number(customHours) > 0 && (selectedCategory?.maxHours === null || selectedCategory?.maxHours === undefined || Number(customHours) <= selectedCategory.maxHours))) &&
    !submitting;

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
        <div className="section-header flex justify-between items-center mb-xl">
          <div>
            <h1 className="page-title">통합 신청</h1>
          </div>
        </div>

        {error && (
          <div className="alert alert-error" style={{ animation: 'slideDown 0.4s var(--ease-out-expo)' }}>
            <span className="alert-icon">⚠️</span>
            {error}
            <button className="alert-dismiss" onClick={() => setError('')}>✕</button>
          </div>
        )}

        {success && (
          <div className="alert alert-success" style={{ animation: 'slideDown 0.4s var(--ease-out-expo)' }}>
            <span className="alert-icon">✅</span>
            {success}
            <button className="alert-dismiss" onClick={() => setSuccess('')} aria-label="알림 닫기">✕</button>
          </div>
        )}

        <div className="grid-12">
          {/* Left Column: Activity Settings (col-span-5) */}
          <div className="card col-5">
            <h3 className="card-title" style={{ fontSize: '1.125rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: 'var(--space-md)', marginBottom: 'var(--space-lg)', display: 'block' }}>
              활동 정보 입력
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">카테고리</label>
                <CustomDropdown
                  categories={categories}
                  categoryId={categoryId as number}
                  setCategoryId={handleCategoryChange}
                  disabled={submitting}
                />
              </div>

              {selectedCategory && (
                <div className="category-info" style={{ margin: '0' }}>
                  {isEtc ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                      <div className="alert alert-info" style={{ margin: 0, padding: '10px 12px', fontSize: '0.8125rem', wordBreak: 'keep-all' }}>
                        <span className="alert-icon">ℹ️</span>
                        시간 변동(가변) 카테고리입니다. 적용할 시간을 입력해 주세요.
                        {selectedCategory.maxHours !== null && selectedCategory.maxHours !== undefined && (
                          <>
                            {' '}
                            <strong>(최대 {selectedCategory.maxHours}시간)</strong>
                          </>
                        )}
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label htmlFor="customHours" className="form-label">신청 시간</label>
                        <input
                          type="number"
                          id="customHours"
                          className="form-input"
                          min={0.5}
                          max={selectedCategory.maxHours !== null && selectedCategory.maxHours !== undefined ? selectedCategory.maxHours : undefined}
                          step={0.5}
                          value={customHours}
                          onChange={(e) => setCustomHours(e.target.value === '' ? '' : parseFloat(e.target.value))}
                          required
                          disabled={submitting}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="category-info-badges" style={{ display: 'flex', gap: '6px' }}>
                      <span className={`badge ${selectedCategory.activityType === 'OFFICIAL' ? 'badge-purple' : 'badge-teal'}`}>
                        {selectedCategory.activityType === 'OFFICIAL' ? '공식 활동' : '자율 활동'}
                      </span>
                      <span className="badge badge-outline">
                        {selectedCategory.assignedHours}시간 배정
                      </span>
                    </div>
                  )}
                </div>
              )}

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label htmlFor="activityDate" className="form-label">활동 날짜</label>
                <input
                  type="date"
                  id="activityDate"
                  name="activityDate"
                  className="form-input"
                  value={activityDate}
                  onChange={(e) => setActivityDate(e.target.value)}
                  onClick={(e) => {
                    try {
                      e.currentTarget.showPicker();
                    } catch (err) {
                      console.error(err);
                    }
                  }}
                  disabled={submitting}
                  required
                  style={{ cursor: 'pointer' }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label htmlFor="description" className="form-label">활동 설명</label>
                <textarea
                  id="description"
                  name="description"
                  className="form-textarea"
                  placeholder="활동 및 신청 사유를 입력하세요 (최소 5자)"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  disabled={submitting}
                  autoComplete="off"
                  style={{ resize: 'none' }}
                />
                <span className={`form-hint ${description.length > 0 && description.length < 5 ? 'form-hint-error' : ''}`}>
                  {description.length}/5 자 이상
                </span>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">증빙 파일 (선택)</label>
                <div
                  className={`file-upload-zone ${dragOver ? 'file-upload-zone-active' : ''} ${fileName ? 'file-upload-zone-filled' : ''}`}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => document.getElementById('fileInput')?.click()}
                >
                  {fileName ? (
                    <div className="file-upload-preview">
                      <span className="file-upload-icon">📎</span>
                      <span className="file-upload-name">{fileName}</span>
                      <button
                        type="button"
                        className="file-upload-remove"
                        onClick={(e) => {
                          e.stopPropagation();
                          setFile(null);
                          setFileName('');
                          const fileInput = document.getElementById('fileInput') as HTMLInputElement;
                          if (fileInput) fileInput.value = '';
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div className="file-upload-placeholder">
                      <span className="file-upload-icon">📁</span>
                      <p>파일을 드래그하거나 클릭하여 업로드</p>
                      <span className="file-upload-hint">이미지, PDF (최대 5MB)</span>
                    </div>
                  )}
                  <input
                    id="fileInput"
                    type="file"
                    className="file-upload-input"
                    onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
                    disabled={submitting}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: User Selection (col-span-7) */}
          <div className="card col-7">
            <div className="flex justify-between items-center" style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: 'var(--space-md)', marginBottom: 'var(--space-lg)' }}>
              <div>
                <h3 className="card-title" style={{ fontSize: '1.125rem', marginBottom: '2px' }}>
                  대상 홍보대사 선택
                </h3>
                <p className="text-secondary" style={{ fontSize: '0.8125rem' }}>일괄 적용할 대상 학생들을 목록에서 체크해 주세요.</p>
              </div>
              <div style={{ display: 'flex', gap: 'var(--space-sm)', alignItems: 'center' }}>
                <span className="badge badge-outline" style={{ fontSize: '0.75rem', fontVariantNumeric: 'tabular-nums', padding: '4px 10px' }}>
                  {selectedUsers.size} / {users.length}명 선택됨
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

            {/* Grid of Users */}
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
                      <span className="bulk-user-name">
                        {user.name}
                      </span>
                      <span className="bulk-user-email">
                        {user.email}
                      </span>
                    </div>
                  </label>
                );
              })}
            </div>

            {/* Submit Buttons */}
            <div className="form-actions">
              <button
                className="btn btn-outline"
                onClick={() => router.push('/admin')}
                disabled={submitting}
              >
                취소
              </button>
              <button
                className="btn btn-primary"
                onClick={() => setVerificationModal(true)}
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
      </div>

      {/* Verification Modal */}
      {verificationModal && (
        <div
          className="modal-overlay"
          onClick={() => setVerificationModal(false)}
        >
          <div
            className="modal"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '440px' }}
          >
            <div className="modal-header">
              <h3 className="modal-title">일괄 신청 확인</h3>
              <button
                className="modal-close"
                onClick={() => setVerificationModal(false)}
                aria-label="모달 닫기"
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>카테고리</span>
                  <strong style={{ fontSize: '0.9375rem', color: 'var(--text-primary)' }}>{selectedCategory?.categoryName}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>활동 유형</span>
                  <span className={`badge ${selectedCategory?.activityType === 'OFFICIAL' ? 'badge-purple' : 'badge-teal'}`}>
                    {selectedCategory?.activityType === 'OFFICIAL' ? '공식 활동' : '자율 활동'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>배정 시간</span>
                  <strong style={{ fontSize: '0.9375rem', color: 'var(--text-primary)' }}>
                    {isEtc ? `${customHours}시간` : `${selectedCategory?.assignedHours}시간`}
                  </strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>대상 인원</span>
                  <strong style={{ color: 'var(--accent)', fontSize: '1rem', fontWeight: 700 }}>{selectedUsers.size}명</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>활동 날짜</span>
                  <strong style={{ fontSize: '0.9375rem', color: 'var(--text-primary)' }}>{activityDate}</strong>
                </div>

                {fileName && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>첨부 파일</span>
                    <strong style={{ fontSize: '0.9375rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '220px' }}>{fileName}</strong>
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-outline"
                onClick={() => setVerificationModal(false)}
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
