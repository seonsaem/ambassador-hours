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
  department?: string | null;
  maxHours?: number | null;
}

const DEPARTMENTS = [
  { value: '', label: '부서 없음' },
  { value: '미디어홍보부', label: '미디어홍보부' },
  { value: '전공체험부', label: '전공체험부' },
  { value: '전략기획부', label: '전략기획부' },
  { value: '임원진/부장', label: '임원진/부장' },
  { value: '신입기수', label: '신입기수' }
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
  type FilterType = 'ALL' | 'OFFICIAL' | '기타 자율' | '미디어홍보부' | '전공체험부' | '전략기획부' | '임원진/부장' | '신입기수';
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

  const handleConfirmDeleteCategory = async (catId: number) => {
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
          <div className="glass-card col-5" style={{ padding: '6px', borderRadius: 'var(--bezel-outer-radius)', background: 'var(--bezel-outer-bg)', border: '1px solid var(--bezel-outer-ring)' }}>
            <div className="glass-card-inner" style={{ borderRadius: 'var(--bezel-inner-radius)', padding: 'var(--space-xl)', background: 'var(--bezel-inner-bg)', boxShadow: 'var(--bezel-inner-highlight)' }}>
              <h3 className="card-title" style={{ fontSize: '1.25rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: 'var(--space-md)', marginBottom: 'var(--space-lg)', display: 'block' }}>
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
                    style={{ background: 'rgba(5,5,8,0.3)', border: '1px solid rgba(255,255,255,0.06)' }}
                  />
                </div>
                
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">활동 유형</label>
                  <div 
                    style={{ 
                      display: 'flex', 
                      background: 'rgba(5,5,8,0.3)', 
                      borderRadius: 'var(--radius-md)', 
                      padding: '4px', 
                      border: '1px solid rgba(255,255,255,0.06)' 
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setNewType('OFFICIAL')}
                      disabled={actionLoading}
                      style={{
                        flex: 1,
                        padding: '10px 0',
                        borderRadius: 'calc(var(--radius-md) - 2px)',
                        background: newType === 'OFFICIAL' ? 'rgba(255,255,255,0.07)' : 'transparent',
                        color: newType === 'OFFICIAL' ? 'var(--text-primary)' : 'var(--text-muted)',
                        border: 'none',
                        fontSize: '0.85rem',
                        fontWeight: newType === 'OFFICIAL' ? 600 : 500,
                        cursor: 'pointer',
                        transition: 'all 200ms cubic-bezier(0.16, 1, 0.3, 1)'
                      }}
                    >
                      공식 활동
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewType('AUTONOMOUS')}
                      disabled={actionLoading}
                      style={{
                        flex: 1,
                        padding: '10px 0',
                        borderRadius: 'calc(var(--radius-md) - 2px)',
                        background: newType === 'AUTONOMOUS' ? 'rgba(255,255,255,0.07)' : 'transparent',
                        color: newType === 'AUTONOMOUS' ? 'var(--text-primary)' : 'var(--text-muted)',
                        border: 'none',
                        fontSize: '0.85rem',
                        fontWeight: newType === 'AUTONOMOUS' ? 600 : 500,
                        cursor: 'pointer',
                        transition: 'all 200ms cubic-bezier(0.16, 1, 0.3, 1)'
                      }}
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
                      className="form-input"
                      onClick={() => setIsNewDeptOpen(!isNewDeptOpen)}
                      disabled={actionLoading}
                      style={{
                        background: 'rgba(5,5,8,0.3)',
                        border: '1px solid rgba(255,255,255,0.06)',
                        color: 'var(--text-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        width: '100%',
                        textAlign: 'left'
                      }}
                    >
                      <span>{DEPARTMENTS.find(d => d.value === newDepartment)?.label || '부서 없음'}</span>
                      <span style={{ fontSize: '0.6rem', opacity: 0.7 }}>{isNewDeptOpen ? '▲' : '▼'}</span>
                    </button>

                    {isNewDeptOpen && (
                      <>
                        <div 
                          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999 }} 
                          onClick={() => setIsNewDeptOpen(false)} 
                        />
                        <div
                          className="glass-card"
                          style={{
                            position: 'absolute',
                            marginTop: '4px',
                            width: '100%',
                            maxHeight: '200px',
                            overflowY: 'auto',
                            zIndex: 1000,
                            background: 'rgba(15, 15, 25, 0.95)',
                            backdropFilter: 'blur(12px)',
                            border: '1px solid rgba(255,255,255,0.08)',
                            borderRadius: 'var(--radius-sm)',
                            boxShadow: '0 8px 32px 0 rgba(0,0,0,0.5)',
                            padding: '4px'
                          }}
                        >
                          {DEPARTMENTS.map((dept) => {
                            const isSelected = newDepartment === dept.value;
                            return (
                              <button
                                key={dept.value}
                                type="button"
                                onClick={() => {
                                  setNewDepartment(dept.value);
                                  setIsNewDeptOpen(false);
                                }}
                                style={{
                                  width: '100%',
                                  padding: '10px 14px',
                                  background: isSelected ? 'rgba(255,255,255,0.06)' : 'transparent',
                                  color: isSelected ? 'var(--secondary)' : 'var(--text-primary)',
                                  border: 'none',
                                  borderRadius: 'calc(var(--radius-sm) - 2px)',
                                  textAlign: 'left',
                                  fontSize: '0.85rem',
                                  fontWeight: isSelected ? 600 : 500,
                                  cursor: 'pointer',
                                  transition: 'all 150ms ease'
                                }}
                                onMouseEnter={(e) => {
                                  if (!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                                }}
                                onMouseLeave={(e) => {
                                  if (!isSelected) e.currentTarget.style.background = 'transparent';
                                }}
                              >
                                {dept.label}
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
                    style={{ background: 'rgba(5,5,8,0.3)', border: '1px solid rgba(255,255,255,0.06)' }}
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
                      style={{ background: 'rgba(5,5,8,0.3)', border: '1px solid rgba(255,255,255,0.06)' }}
                    />
                  </div>
                )}

                <button 
                  type="submit" 
                  className="btn btn-primary btn-full mt-sm" 
                  disabled={actionLoading || !newName.trim()}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '44px', fontWeight: 600 }}
                >
                  {actionLoading ? (
                    <span className="loading-spinner-sm" />
                  ) : (
                    '카테고리 등록'
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Right Column: Category List (col-span-7) */}
          <div className="glass-card col-7" style={{ padding: '6px', borderRadius: 'var(--bezel-outer-radius)', background: 'var(--bezel-outer-bg)', border: '1px solid var(--bezel-outer-ring)' }}>
            <div className="glass-card-inner" style={{ borderRadius: 'var(--bezel-inner-radius)', padding: 'var(--space-xl)', background: 'var(--bezel-inner-bg)', boxShadow: 'var(--bezel-inner-highlight)' }}>
              <div className="flex justify-between items-center" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: 'var(--space-md)', marginBottom: 'var(--space-lg)', flexWrap: 'wrap', gap: 'var(--space-sm)' }}>
                <div>
                  <h3 className="card-title" style={{ fontSize: '1.25rem', marginBottom: '2px' }}>
                    등록된 카테고리
                  </h3>
                  <span className="badge badge-outline" style={{ fontSize: '0.7rem', padding: '2px 8px' }}>
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

                {/* Filter Tabs */}
                <div 
                  style={{ 
                    display: 'flex', 
                    background: 'rgba(5,5,8,0.4)', 
                    borderRadius: 'var(--radius-sm)', 
                    padding: '2px', 
                    border: '1px solid rgba(255,255,255,0.05)',
                    flexWrap: 'wrap',
                    gap: '2px'
                  }}
                >
                  {(['ALL', 'OFFICIAL', '기타 자율', '미디어홍보부', '전공체험부', '전략기획부', '임원진/부장', '신입기수'] as const).map((filter) => (
                    <button
                      key={filter}
                      type="button"
                      onClick={() => setListFilter(filter)}
                      style={{
                        padding: '4px 10px',
                        borderRadius: 'calc(var(--radius-sm) - 1px)',
                        background: listFilter === filter ? 'rgba(255,255,255,0.07)' : 'transparent',
                        color: listFilter === filter ? 'var(--text-primary)' : 'var(--text-muted)',
                        border: 'none',
                        fontSize: '0.75rem',
                        fontWeight: listFilter === filter ? 600 : 500,
                        cursor: 'pointer',
                        transition: 'all 200ms ease'
                      }}
                    >
                      {filter === 'ALL' ? '전체' : filter === 'OFFICIAL' ? '공식' : filter}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
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
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 'var(--space-sm)',
                      padding: '1.2rem',
                      background: cat.isActive ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.005)',
                      border: '1px solid rgba(255,255,255,0.04)',
                      borderRadius: 'var(--radius-md)',
                      opacity: cat.isActive ? 1 : 0.6,
                      transition: 'all 400ms cubic-bezier(0.32, 0.72, 0, 1)',
                    }}
                    onMouseEnter={(e) => {
                      if (cat.isActive) {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                        e.currentTarget.style.transform = 'translateY(-1px)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (cat.isActive) {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.04)';
                        e.currentTarget.style.transform = 'none';
                      }
                    }}
                  >
                    {editId === cat.id ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                        <div className="form-row category-edit-grid">
                          <div>
                            <label className="form-label" style={{ fontSize: '0.7rem' }}>카테고리명</label>
                            <input
                              type="text"
                              className="form-input form-input-sm"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              style={{ background: 'rgba(5,5,8,0.5)' }}
                            />
                          </div>
                          <div>
                            <label className="form-label" style={{ fontSize: '0.7rem' }}>활동유형</label>
                            <div 
                              style={{ 
                                display: 'flex', 
                                background: 'rgba(5,5,8,0.5)', 
                                borderRadius: 'var(--radius-sm)', 
                                padding: '2px', 
                                border: '1px solid rgba(255,255,255,0.06)' 
                              }}
                            >
                              <button
                                type="button"
                                onClick={() => setEditType('OFFICIAL')}
                                style={{
                                  flex: 1,
                                  padding: '5px 0',
                                  borderRadius: 'calc(var(--radius-sm) - 1px)',
                                  background: editType === 'OFFICIAL' ? 'rgba(255,255,255,0.07)' : 'transparent',
                                  color: editType === 'OFFICIAL' ? 'var(--text-primary)' : 'var(--text-muted)',
                                  border: 'none',
                                  fontSize: '0.75rem',
                                  fontWeight: editType === 'OFFICIAL' ? 600 : 500,
                                  cursor: 'pointer',
                                  transition: 'all 200ms ease'
                                }}
                              >
                                공식
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditType('AUTONOMOUS')}
                                style={{
                                  flex: 1,
                                  padding: '5px 0',
                                  borderRadius: 'calc(var(--radius-sm) - 1px)',
                                  background: editType === 'AUTONOMOUS' ? 'rgba(255,255,255,0.07)' : 'transparent',
                                  color: editType === 'AUTONOMOUS' ? 'var(--text-primary)' : 'var(--text-muted)',
                                  border: 'none',
                                  fontSize: '0.75rem',
                                  fontWeight: editType === 'AUTONOMOUS' ? 600 : 500,
                                  cursor: 'pointer',
                                  transition: 'all 200ms ease'
                                }}
                              >
                                자율
                              </button>
                            </div>
                          </div>
                          <div>
                            <label className="form-label" style={{ fontSize: '0.7rem' }}>배정시간</label>
                            <input
                              type="number"
                              className="form-input form-input-sm"
                              min={0}
                              step={0.5}
                              value={editHours}
                              onChange={(e) => setEditHours(parseFloat(e.target.value))}
                              style={{ background: 'rgba(5,5,8,0.5)' }}
                            />
                          </div>
                        </div>

                        {editType === 'AUTONOMOUS' && (
                          <div style={{ marginTop: '2px', position: 'relative' }}>
                            <label className="form-label" style={{ fontSize: '0.7rem' }}>담당 부서</label>
                            <button
                              type="button"
                              className="form-input form-input-sm"
                              onClick={() => setIsEditDeptOpen(!isEditDeptOpen)}
                              disabled={actionLoading}
                              style={{
                                background: 'rgba(5,5,8,0.5)',
                                color: 'var(--text-primary)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                cursor: 'pointer',
                                width: '100%',
                                textAlign: 'left'
                              }}
                            >
                              <span>{DEPARTMENTS.find(d => d.value === editDepartment)?.label || '부서 없음'}</span>
                              <span style={{ fontSize: '0.6rem', opacity: 0.7 }}>{isEditDeptOpen ? '▲' : '▼'}</span>
                            </button>

                            {isEditDeptOpen && (
                              <>
                                <div 
                                  style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999 }} 
                                  onClick={() => setIsEditDeptOpen(false)} 
                                />
                                <div
                                  className="glass-card"
                                  style={{
                                    position: 'absolute',
                                    marginTop: '4px',
                                    width: '100%',
                                    maxHeight: '150px',
                                    overflowY: 'auto',
                                    zIndex: 1000,
                                    background: 'rgba(15, 15, 25, 0.95)',
                                    backdropFilter: 'blur(12px)',
                                    border: '1px solid rgba(255,255,255,0.08)',
                                    borderRadius: 'var(--radius-sm)',
                                    boxShadow: '0 8px 32px 0 rgba(0,0,0,0.5)',
                                    padding: '4px'
                                  }}
                                >
                                  {DEPARTMENTS.map((dept) => {
                                    const isSelected = editDepartment === dept.value;
                                    return (
                                      <button
                                        key={dept.value}
                                        type="button"
                                        onClick={() => {
                                          setEditDepartment(dept.value);
                                          setIsEditDeptOpen(false);
                                        }}
                                        style={{
                                          width: '100%',
                                          padding: '8px 12px',
                                          background: isSelected ? 'rgba(255,255,255,0.06)' : 'transparent',
                                          color: isSelected ? 'var(--secondary)' : 'var(--text-primary)',
                                          border: 'none',
                                          borderRadius: 'calc(var(--radius-sm) - 2px)',
                                          textAlign: 'left',
                                          fontSize: '0.8rem',
                                          fontWeight: isSelected ? 600 : 500,
                                          cursor: 'pointer',
                                          transition: 'all 150ms ease'
                                        }}
                                        onMouseEnter={(e) => {
                                          if (!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                                        }}
                                        onMouseLeave={(e) => {
                                          if (!isSelected) e.currentTarget.style.background = 'transparent';
                                        }}
                                      >
                                        {dept.label}
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
                            <label className="form-label" style={{ fontSize: '0.7rem' }}>최대 제한 시간 (선택)</label>
                            <input
                              type="number"
                              className="form-input form-input-sm"
                              min={0.5}
                              step={0.5}
                              placeholder="제한 없음"
                              value={editMaxHours}
                              onChange={(e) => setEditMaxHours(e.target.value)}
                              disabled={actionLoading}
                              style={{ background: 'rgba(5,5,8,0.5)' }}
                            />
                          </div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-sm)' }}>
                          <button
                            className="btn btn-success btn-sm"
                            onClick={() => handleEdit(cat.id)}
                            disabled={actionLoading}
                            style={{ height: '32px', padding: '0 var(--space-md)' }}
                          >
                            저장
                          </button>
                          <button
                            className="btn btn-outline btn-sm"
                            onClick={() => setEditId(null)}
                            style={{ height: '32px', padding: '0 var(--space-md)' }}
                          >
                            취소
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-md)' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <span style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                            {cat.categoryName}
                          </span>
                          <div style={{ display: 'flex', gap: 'var(--space-xs)', alignItems: 'center' }}>
                            <span className={`badge ${cat.activityType === 'OFFICIAL' ? 'badge-purple' : 'badge-teal'}`} style={{ fontSize: '0.65rem', padding: '2px 8px' }}>
                              {cat.activityType === 'OFFICIAL' ? '공식' : '자율'}
                            </span>
                            {cat.activityType === 'AUTONOMOUS' && cat.department && (
                              <span className="badge badge-outline" style={{ fontSize: '0.65rem', padding: '2px 8px', borderColor: 'rgba(176,154,92,0.3)', color: '#b09a5c', background: 'rgba(176,154,92,0.05)' }}>
                                {cat.department}
                              </span>
                            )}
                            <span className="badge badge-outline" style={{ fontSize: '0.65rem', padding: '2px 8px', borderColor: 'rgba(255,255,255,0.06)', color: 'var(--secondary)' }}>
                              {cat.assignedHours === 0 ? (cat.maxHours ? `가변 시간 (최대 ${cat.maxHours}h)` : '가변 시간') : `${cat.assignedHours}시간 배정`}
                            </span>
                            {!cat.isActive && (
                              <span className="badge badge-danger" style={{ fontSize: '0.65rem', padding: '2px 8px' }}>
                                비활성
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="action-buttons" style={{ display: 'flex', gap: 'var(--space-xs)' }}>
                          <button
                            className="btn btn-outline btn-sm"
                            onClick={() => startEdit(cat)}
                            disabled={actionLoading}
                            style={{ height: '32px', padding: '0 var(--space-md)', fontSize: '0.75rem' }}
                          >
                            수정
                          </button>
                          {cat.categoryName !== '기타' && (
                            <>
                              <button
                                className={`btn btn-sm ${cat.isActive ? 'btn-outline-danger' : 'btn-success'}`}
                                onClick={() => handleToggleActive(cat)}
                                disabled={actionLoading}
                                style={{ height: '32px', padding: '0 var(--space-md)', fontSize: '0.75rem' }}
                              >
                                {cat.isActive ? '비활성화' : '활성화'}
                              </button>
                              <button
                                className="btn btn-ghost btn-sm"
                                onClick={() => setDeleteCategory(cat)}
                                disabled={actionLoading}
                                style={{ height: '32px', width: '32px', borderRadius: '50%', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                aria-label="카테고리 삭제"
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
      </div>

      {/* Delete Category Confirmation Modal */}
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
                onClick={() => handleConfirmDeleteCategory(deleteCategory.id)}
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
