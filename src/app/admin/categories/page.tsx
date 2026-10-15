'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { DEPARTMENTS as SHARED_DEPARTMENTS, Department } from '@/lib/constants';

interface Category {
  id: number;
  categoryName: string;
  activityType: 'OFFICIAL' | 'AUTONOMOUS';
  assignedHours: number;
  isActive: boolean;
  department?: string | null;
  maxHours?: number | null;
}

const DEPARTMENT_OPTIONS = [
  { value: '', label: '부서 없음' },
  ...SHARED_DEPARTMENTS.map(dept => ({ value: dept, label: dept }))
];

export default function CategoriesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // New category form
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<'OFFICIAL' | 'AUTONOMOUS'>('OFFICIAL');
  const [newHours, setNewHours] = useState<number>(1);
  const [newMaxHours, setNewMaxHours] = useState<string>('');
  const [newDepartment, setNewDepartment] = useState<string>('');
  const [isNewDeptOpen, setIsNewDeptOpen] = useState(false);

  // Edit state
  const [editId, setEditId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editType, setEditType] = useState<'OFFICIAL' | 'AUTONOMOUS'>('OFFICIAL');
  const [editHours, setEditHours] = useState<number>(1);
  const [editMaxHours, setEditMaxHours] = useState<string>('');
  const [editDepartment, setEditDepartment] = useState<string>('');
  const [isEditDeptOpen, setIsEditDeptOpen] = useState(false);
  const [deleteCategory, setDeleteCategory] = useState<Category | null>(null);
  type FilterType = 'ALL' | 'OFFICIAL' | '기타 자율' | Department;
  const [listFilter, setListFilter] = useState<FilterType>('ALL');

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

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch('/api/categories');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setCategories(data);
    } catch {
      setError('카테고리를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === 'authenticated' && session?.user?.role === 'ADMIN') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchCategories();
    }
  }, [status, session, fetchCategories]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setActionLoading(true);
    setError('');

    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryName: newName.trim(),
          activityType: newType,
          assignedHours: newHours,
          department: newType === 'AUTONOMOUS' ? (newDepartment || null) : null,
          maxHours: newHours === 0 && newMaxHours !== '' ? parseFloat(newMaxHours) : null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create');
      }

      setNewName('');
      setNewType('OFFICIAL');
      setNewHours(1);
      setNewMaxHours('');
      setNewDepartment('');
      await fetchCategories();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '카테고리 추가 중 오류가 발생했습니다.');
    } finally {
      setActionLoading(false);
    }
  };

  const startEdit = (cat: Category) => {
    setEditId(cat.id);
    setEditName(cat.categoryName);
    setEditType(cat.activityType);
    setEditHours(cat.assignedHours);
    setEditMaxHours(cat.maxHours !== null && cat.maxHours !== undefined ? cat.maxHours.toString() : '');
    setEditDepartment(cat.department || '');
  };

  const handleEdit = async (catId: number) => {
    setActionLoading(true);
    setError('');

    try {
      const res = await fetch(`/api/categories/${catId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryName: editName.trim(),
          activityType: editType,
          assignedHours: editHours,
          department: editType === 'AUTONOMOUS' ? (editDepartment || null) : null,
          maxHours: editHours === 0 && editMaxHours !== '' ? parseFloat(editMaxHours) : null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update');
      }

      setEditId(null);
      await fetchCategories();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '카테고리 수정 중 오류가 발생했습니다.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleActive = async (cat: Category) => {
    if (cat.categoryName === '기타') return; // Cannot deactivate ETC
    setActionLoading(true);
    setError('');

    try {
      const res = await fetch(`/api/categories/${cat.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isActive: !cat.isActive,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update');
      }

      await fetchCategories();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '상태 변경 중 오류가 발생했습니다.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteCategoryVerification = async (catId: number) => {
    setActionLoading(true);
    setError('');

    try {
      const res = await fetch(`/api/categories/${catId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete category');
      }

      setDeleteCategory(null);
      await fetchCategories();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '카테고리 삭제 중 오류가 발생했습니다.');
    } finally {
      setActionLoading(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <>
        <Navbar />
        <div className="container">
          <div className="page-header">
            <h1 className="page-title">카테고리 관리</h1>
          </div>
          <div className="card skeleton-card" style={{ marginBottom: '1.5rem' }}>
            <div className="skeleton skeleton-heading" />
            <div className="skeleton skeleton-text" />
          </div>
          <div className="card skeleton-card">
            <div className="skeleton skeleton-heading" />
            {[1, 2, 3].map((i) => (
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
            <h1 className="page-title">카테고리 설정</h1>
          </div>
        </div>

        {error && (
          <div className="alert alert-error" style={{ animation: 'slideDown 0.4s var(--ease-out-expo)' }}>
            <span className="alert-icon">⚠️</span>
            {error}
            <button className="alert-dismiss" onClick={() => setError('')}>✕</button>
          </div>
        )}

        <div className="grid-12">
          {/* Left Column: Add New Category (col-span-5) */}
          <div className="card col-5">
            <h3 className="card-title" style={{ fontSize: '1.125rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: 'var(--space-md)', marginBottom: 'var(--space-lg)', display: 'block' }}>
              새 카테고리 추가
            </h3>
            <form onSubmit={handleAdd} className="category-add-form" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">카테고리명</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="예: 교내 행사 의전"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  required
                  disabled={actionLoading}
                />
              </div>
              
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">활동 유형</label>
                <div className="segmented-control" style={{ display: 'flex', width: '100%' }}>
                  <button
                    type="button"
                    onClick={() => setNewType('OFFICIAL')}
                    disabled={actionLoading}
                    className={`segmented-btn ${newType === 'OFFICIAL' ? 'segmented-btn-active' : ''}`}
                    style={{ flex: 1 }}
                  >
                    공식 활동
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewType('AUTONOMOUS')}
                    disabled={actionLoading}
                    className={`segmented-btn ${newType === 'AUTONOMOUS' ? 'segmented-btn-active' : ''}`}
                    style={{ flex: 1 }}
                  >
                    자율 활동
                  </button>
                </div>
              </div>

              {newType === 'AUTONOMOUS' && (
                <div className="form-group" style={{ marginBottom: 0, position: 'relative' }}>
                  <label className="form-label">담당 부서 (선택)</label>
                  <button
                    type="button"
                    className={`custom-dropdown-trigger ${isNewDeptOpen ? 'custom-dropdown-trigger-open' : ''}`}
                    onClick={() => setIsNewDeptOpen(!isNewDeptOpen)}
                    disabled={actionLoading}
                  >
                    <span>{DEPARTMENT_OPTIONS.find(d => d.value === newDepartment)?.label || '부서 없음'}</span>
                    <span className={`custom-dropdown-chevron ${isNewDeptOpen ? 'custom-dropdown-chevron-open' : ''}`}>▼</span>
                  </button>

                  {isNewDeptOpen && (
                    <>
                      <div 
                        style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999 }} 
                        onClick={() => setIsNewDeptOpen(false)} 
                      />
                      <div className="custom-dropdown-menu" style={{ maxHeight: '220px' }}>
                        {DEPARTMENT_OPTIONS.map((dept) => {
                          const isSelected = newDepartment === dept.value;
                          return (
                            <button
                              key={dept.value}
                              type="button"
                              onClick={() => {
                                setNewDepartment(dept.value);
                                setIsNewDeptOpen(false);
                              }}
                              className={`custom-dropdown-item ${isSelected ? 'custom-dropdown-item-selected' : ''}`}
                            >
                              <span>{dept.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              )}

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">기본 배정 시간</label>
                <input
                  type="number"
                  className="form-input"
                  min={0}
                  step={0.5}
                  value={newHours}
                  onChange={(e) => setNewHours(parseFloat(e.target.value))}
                  required
                  disabled={actionLoading}
                />
              </div>

              {newHours === 0 && (
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">최대 제한 시간 (선택)</label>
                  <input
                    type="number"
                    className="form-input"
                    min={0.5}
                    step={0.5}
                    placeholder="제한 없음"
                    value={newMaxHours}
                    onChange={(e) => setNewMaxHours(e.target.value)}
                    disabled={actionLoading}
                  />
                </div>
              )}

              <button 
                type="submit" 
                className="btn btn-primary btn-full mt-sm" 
                disabled={actionLoading || !newName.trim()}
              >
                {actionLoading ? (
                  <span className="loading-spinner-sm" />
                ) : (
                  '카테고리 등록'
                )}
              </button>
            </form>
          </div>

          {/* Right Column: Category List (col-span-7) */}
          <div className="card col-7" style={{ minWidth: 0 }}>
            <div style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: 'var(--space-md)', marginBottom: 'var(--space-lg)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h3 className="card-title" style={{ fontSize: '1.125rem', marginBottom: 0 }}>
                    등록된 카테고리
                  </h3>
                  <span className="badge badge-outline" style={{ fontSize: '0.75rem', padding: '2px 8px' }}>
                    총 {
                      categories.filter((cat) => {
                        if (listFilter === 'ALL') return true;
                        if (listFilter === 'OFFICIAL') return cat.activityType === 'OFFICIAL';
                        if (listFilter === '기타 자율') return cat.activityType === 'AUTONOMOUS' && !cat.department;
                        return cat.activityType === 'AUTONOMOUS' && cat.department === listFilter;
                      }).length
                    }개
                  </span>
                </div>
              </div>

              {/* Filter Tabs (Wrapping Pills) */}
              <div className="category-filter-pills">
                {(['ALL', 'OFFICIAL', '기타 자율', ...SHARED_DEPARTMENTS] as const).map((filter) => (
                  <button
                    key={filter}
                    type="button"
                    onClick={() => setListFilter(filter)}
                    className={`category-filter-pill ${listFilter === filter ? 'is-active' : ''}`}
                  >
                    {filter === 'ALL' ? '전체' : filter === 'OFFICIAL' ? '공식' : filter}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
              {categories
                .filter((cat) => {
                  if (listFilter === 'ALL') return true;
                  if (listFilter === 'OFFICIAL') return cat.activityType === 'OFFICIAL';
                  if (listFilter === '기타 자율') return cat.activityType === 'AUTONOMOUS' && !cat.department;
                  return cat.activityType === 'AUTONOMOUS' && cat.department === listFilter;
                })
                .map((cat) => (
                <div 
                  key={cat.id} 
                  className="category-item-row"
                  style={{ opacity: cat.isActive ? 1 : 0.6 }}
                >
                  {editId === cat.id ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
                      {/* Row 1: Full-width Category Name so long names never overflow or get clipped */}
                      <div style={{ width: '100%' }}>
                        <label className="form-label" style={{ fontSize: '0.78rem' }}>카테고리명</label>
                        <input
                          type="text"
                          className="form-input form-input-sm"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          style={{ width: '100%' }}
                        />
                      </div>

                      {/* Row 2: Activity Type + Assigned Hours */}
                      <div className="category-edit-grid">
                        <div style={{ minWidth: 0 }}>
                          <label className="form-label" style={{ fontSize: '0.78rem' }}>활동 유형</label>
                          <div className="segmented-control" style={{ display: 'flex', width: '100%' }}>
                            <button
                              type="button"
                              onClick={() => setEditType('OFFICIAL')}
                              className={`segmented-btn ${editType === 'OFFICIAL' ? 'segmented-btn-active is-active' : ''}`}
                              style={{ flex: 1, padding: '6px 8px', fontSize: '0.78rem' }}
                            >
                              공식 활동
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditType('AUTONOMOUS')}
                              className={`segmented-btn ${editType === 'AUTONOMOUS' ? 'segmented-btn-active is-active' : ''}`}
                              style={{ flex: 1, padding: '6px 8px', fontSize: '0.78rem' }}
                            >
                              자율 활동
                            </button>
                          </div>
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <label className="form-label" style={{ fontSize: '0.78rem' }}>배정 시간</label>
                          <input
                            type="number"
                            className="form-input form-input-sm"
                            min={0}
                            step={0.5}
                            value={editHours}
                            onChange={(e) => setEditHours(parseFloat(e.target.value))}
                            style={{ width: '100%' }}
                          />
                        </div>
                      </div>

                      {editType === 'AUTONOMOUS' && (
                        <div style={{ marginTop: '2px', position: 'relative' }}>
                          <label className="form-label" style={{ fontSize: '0.78rem' }}>담당 부서</label>
                          <button
                            type="button"
                            className={`custom-dropdown-trigger ${isEditDeptOpen ? 'custom-dropdown-trigger-open' : ''}`}
                            onClick={() => setIsEditDeptOpen(!isEditDeptOpen)}
                            disabled={actionLoading}
                            style={{ minHeight: '36px', padding: '6px 12px', fontSize: '0.8125rem' }}
                          >
                            <span>{DEPARTMENT_OPTIONS.find(d => d.value === editDepartment)?.label || '부서 없음'}</span>
                            <span className={`custom-dropdown-chevron ${isEditDeptOpen ? 'custom-dropdown-chevron-open' : ''}`}>▼</span>
                          </button>

                          {isEditDeptOpen && (
                            <>
                              <div 
                                style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999 }} 
                                onClick={() => setIsEditDeptOpen(false)} 
                              />
                              <div className="custom-dropdown-menu" style={{ maxHeight: '180px' }}>
                                {DEPARTMENT_OPTIONS.map((dept) => {
                                  const isSelected = editDepartment === dept.value;
                                  return (
                                    <button
                                      key={dept.value}
                                      type="button"
                                      onClick={() => {
                                        setEditDepartment(dept.value);
                                        setIsEditDeptOpen(false);
                                      }}
                                      className={`custom-dropdown-item ${isSelected ? 'custom-dropdown-item-selected is-selected' : ''}`}
                                    >
                                      <span>{dept.label}</span>
                                    </button>
                                  );
                                })}
                              </div>
                            </>
                          )}
                        </div>
                      )}

                      {editHours === 0 && (
                        <div style={{ marginTop: '4px' }}>
                          <label className="form-label" style={{ fontSize: '0.78rem' }}>최대 제한 시간 (선택)</label>
                          <input
                            type="number"
                            className="form-input form-input-sm"
                            min={0.5}
                            step={0.5}
                            placeholder="제한 없음"
                            value={editMaxHours}
                            onChange={(e) => setEditMaxHours(e.target.value)}
                            disabled={actionLoading}
                          />
                        </div>
                      )}

                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-sm)', paddingTop: '4px' }}>
                        <button
                          className="btn btn-success btn-sm"
                          onClick={() => handleEdit(cat.id)}
                          disabled={actionLoading}
                        >
                          저장
                        </button>
                        <button
                          className="btn btn-outline btn-sm"
                          onClick={() => setEditId(null)}
                        >
                          취소
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: '1 1 240px', minWidth: 0 }}>
                        <span
                          style={{
                            fontSize: '0.9375rem',
                            fontWeight: 700,
                            color: 'var(--text-primary)',
                            lineHeight: 1.4,
                            wordBreak: 'keep-all',
                            overflowWrap: 'break-word',
                          }}
                        >
                          {cat.categoryName}
                        </span>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                          <span className={`badge ${cat.activityType === 'OFFICIAL' ? 'badge-purple' : 'badge-teal'}`}>
                            {cat.activityType === 'OFFICIAL' ? '공식' : '자율'}
                          </span>
                          {cat.activityType === 'AUTONOMOUS' && cat.department && (
                            <span className="badge badge-gold">
                              {cat.department}
                            </span>
                          )}
                          <span className="badge badge-outline">
                            {cat.assignedHours === 0 ? (cat.maxHours ? `가변 시간 (최대 ${cat.maxHours}h)` : '가변 시간') : `${cat.assignedHours}시간 배정`}
                          </span>
                          {!cat.isActive && (
                            <span className="badge badge-danger">
                              비활성
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="action-buttons" style={{ display: 'flex', gap: '6px', flexShrink: 0, alignItems: 'center' }}>
                        <button
                          className="btn btn-outline btn-sm"
                          onClick={() => startEdit(cat)}
                          disabled={actionLoading}
                        >
                          수정
                        </button>
                        {cat.categoryName !== '기타' && (
                          <>
                            <button
                              className={`btn btn-sm ${cat.isActive ? 'btn-outline-danger' : 'btn-success'}`}
                              onClick={() => handleToggleActive(cat)}
                              disabled={actionLoading}
                            >
                              {cat.isActive ? '비활성화' : '활성화'}
                            </button>
                            <button
                              className="btn btn-ghost btn-sm"
                              onClick={() => setDeleteCategory(cat)}
                              disabled={actionLoading}
                              style={{ height: '32px', width: '32px', borderRadius: 'var(--radius-sm)', padding: 0 }}
                              aria-label="카테고리 삭제"
                              title="카테고리 삭제"
                            >
                              🗑️
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Delete Category Verification Modal */}
      {deleteCategory && (
        <div className="modal-overlay" onClick={() => setDeleteCategory(null)}>
          <div className="modal glass-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">카테고리 삭제</h3>
              <button className="modal-close" onClick={() => setDeleteCategory(null)} aria-label="모달 닫기">✕</button>
            </div>
            <div className="modal-body">
              <div className="modal-info">
                <p>
                  <strong>{deleteCategory.categoryName}</strong> 카테고리를 정말로 삭제하시겠습니까?
                </p>
                <p style={{ color: 'var(--danger)', fontSize: '0.85rem', marginTop: '0.5rem' }}>
                  ⚠️ 이 카테고리에 속한 모든 활동 신청 내역이 함께 삭제되며, 이 작업은 취소할 수 없습니다.
                </p>
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-outline"
                onClick={() => setDeleteCategory(null)}
                disabled={actionLoading}
              >
                취소
              </button>
              <button
                className="btn btn-danger"
                onClick={() => handleDeleteCategoryVerification(deleteCategory.id)}
                disabled={actionLoading}
              >
                {actionLoading ? (
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
