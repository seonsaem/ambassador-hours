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

  // Edit state
  const [editId, setEditId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editType, setEditType] = useState<'OFFICIAL' | 'AUTONOMOUS'>('OFFICIAL');
  const [editHours, setEditHours] = useState<number>(1);
  const [listFilter, setListFilter] = useState<'ALL' | 'OFFICIAL' | 'AUTONOMOUS'>('ALL');

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
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create');
      }

      setNewName('');
      setNewType('OFFICIAL');
      setNewHours(1);
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

  const handleDeleteCategory = async (catId: number) => {
    if (!confirm('정말로 이 카테고리를 완전히 삭제하시겠습니까?')) return;
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

        <div className="grid-metrics" style={{ gridTemplateColumns: 'repeat(12, 1fr)', gap: 'var(--space-xl)', alignItems: 'start' }}>
          {/* Left Column: Add New Category (col-span-5) */}
          <div className="glass-card" style={{ gridColumn: 'span 5', padding: '6px', borderRadius: 'var(--bezel-outer-radius)', background: 'var(--bezel-outer-bg)', border: '1px solid var(--bezel-outer-ring)' }}>
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

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">기본 배정 시간</label>
                  <input
                    type="number"
                    className="form-input"
                    min={0.5}
                    step={0.5}
                    value={newHours}
                    onChange={(e) => setNewHours(parseFloat(e.target.value))}
                    required
                    disabled={actionLoading}
                    style={{ background: 'rgba(5,5,8,0.3)', border: '1px solid rgba(255,255,255,0.06)' }}
                  />
                </div>

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
          <div className="glass-card" style={{ gridColumn: 'span 7', padding: '6px', borderRadius: 'var(--bezel-outer-radius)', background: 'var(--bezel-outer-bg)', border: '1px solid var(--bezel-outer-ring)' }}>
            <div className="glass-card-inner" style={{ borderRadius: 'var(--bezel-inner-radius)', padding: 'var(--space-xl)', background: 'var(--bezel-inner-bg)', boxShadow: 'var(--bezel-inner-highlight)' }}>
              <div className="flex justify-between items-center" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: 'var(--space-md)', marginBottom: 'var(--space-lg)', flexWrap: 'wrap', gap: 'var(--space-sm)' }}>
                <div>
                  <h3 className="card-title" style={{ fontSize: '1.25rem', marginBottom: '2px' }}>
                    등록된 카테고리
                  </h3>
                  <span className="badge badge-outline" style={{ fontSize: '0.7rem', padding: '2px 8px' }}>
                    총 {categories.filter(c => listFilter === 'ALL' ? true : c.activityType === listFilter).length}개
                  </span>
                </div>

                {/* Filter Tabs */}
                <div 
                  style={{ 
                    display: 'flex', 
                    background: 'rgba(5,5,8,0.4)', 
                    borderRadius: 'var(--radius-sm)', 
                    padding: '2px', 
                    border: '1px solid rgba(255,255,255,0.05)' 
                  }}
                >
                  {(['ALL', 'OFFICIAL', 'AUTONOMOUS'] as const).map((filter) => (
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
                      {filter === 'ALL' ? '전체' : filter === 'OFFICIAL' ? '공식' : '자율'}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                {categories
                  .filter((cat) => listFilter === 'ALL' ? true : cat.activityType === listFilter)
                  .map((cat) => (
                  <div 
                    key={cat.id} 
                    className="category-item-row"
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 'var(--space-sm)',
                      padding: 'var(--space-md)',
                      background: !cat.isActive 
                        ? 'rgba(255,255,255,0.005)' 
                        : cat.activityType === 'OFFICIAL'
                          ? 'rgba(168, 85, 247, 0.02)'
                          : 'rgba(20, 184, 166, 0.02)',
                      border: !cat.isActive
                        ? '1px solid rgba(255,255,255,0.03)'
                        : cat.activityType === 'OFFICIAL'
                          ? '1px solid rgba(168, 85, 247, 0.15)'
                          : '1px solid rgba(20, 184, 166, 0.15)',
                      borderRadius: 'var(--radius-md)',
                      opacity: cat.isActive ? 1 : 0.5,
                      boxShadow: cat.isActive 
                        ? cat.activityType === 'OFFICIAL'
                          ? '0 4px 20px rgba(168, 85, 247, 0.02)' 
                          : '0 4px 20px rgba(20, 184, 166, 0.02)'
                        : 'none',
                      transition: 'all 300ms var(--ease-spring)',
                    }}
                  >
                    {editId === cat.id ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                        <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr', gap: 'var(--space-sm)' }}>
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
                              min={0.5}
                              step={0.5}
                              value={editHours}
                              onChange={(e) => setEditHours(parseFloat(e.target.value))}
                              style={{ background: 'rgba(5,5,8,0.5)' }}
                            />
                          </div>
                        </div>
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
                            <span className="badge badge-outline" style={{ fontSize: '0.65rem', padding: '2px 8px', borderColor: 'rgba(255,255,255,0.06)', color: 'var(--secondary)' }}>
                              {cat.assignedHours}시간 배정
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
                                onClick={() => handleDeleteCategory(cat.id)}
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
    </>
  );
}
