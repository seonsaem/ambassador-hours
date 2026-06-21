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
        <div className="page-header">
          <h1 className="page-title">카테고리 관리</h1>
        </div>

        {error && (
          <div className="alert alert-error">
            <span className="alert-icon">⚠️</span>
            {error}
            <button className="alert-dismiss" onClick={() => setError('')}>✕</button>
          </div>
        )}

        {/* Add New Category */}
        <div className="card" style={{ marginBottom: '2rem' }}>
          <h3 className="card-title">새 카테고리 추가</h3>
          <form onSubmit={handleAdd} className="category-add-form">
            <div className="form-row">
              <div className="form-group form-group-flex">
                <label className="form-label">카테고리명</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="카테고리 이름"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  required
                  disabled={actionLoading}
                />
              </div>
              <div className="form-group form-group-flex">
                <label className="form-label">활동 유형</label>
                <select
                  className="form-select"
                  value={newType}
                  onChange={(e) => setNewType(e.target.value as 'OFFICIAL' | 'AUTONOMOUS')}
                  disabled={actionLoading}
                >
                  <option value="OFFICIAL">공식</option>
                  <option value="AUTONOMOUS">자율</option>
                </select>
              </div>
              <div className="form-group form-group-flex">
                <label className="form-label">배정 시간</label>
                <input
                  type="number"
                  className="form-input"
                  min={0.5}
                  step={0.5}
                  value={newHours}
                  onChange={(e) => setNewHours(parseFloat(e.target.value))}
                  required
                  disabled={actionLoading}
                />
              </div>
              <div className="form-group form-group-flex form-group-action">
                <button type="submit" className="btn btn-primary" disabled={actionLoading || !newName.trim()}>
                  {actionLoading ? (
                    <span className="btn-loading">
                      <span className="loading-spinner-sm" />
                    </span>
                  ) : (
                    '추가'
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Category List */}
        <div className="card">
          <h3 className="card-title">카테고리 목록</h3>
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>카테고리명</th>
                  <th>활동유형</th>
                  <th>배정시간</th>
                  <th>상태</th>
                  <th>액션</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((cat) => (
                  <tr key={cat.id} className={!cat.isActive ? 'row-inactive' : ''}>
                    {editId === cat.id ? (
                      <>
                        <td>{cat.id}</td>
                        <td>
                          <input
                            type="text"
                            className="form-input form-input-sm"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                          />
                        </td>
                        <td>
                          <select
                            className="form-select form-select-sm"
                            value={editType}
                            onChange={(e) => setEditType(e.target.value as 'OFFICIAL' | 'AUTONOMOUS')}
                          >
                            <option value="OFFICIAL">공식</option>
                            <option value="AUTONOMOUS">자율</option>
                          </select>
                        </td>
                        <td>
                          <input
                            type="number"
                            className="form-input form-input-sm"
                            min={0.5}
                            step={0.5}
                            value={editHours}
                            onChange={(e) => setEditHours(parseFloat(e.target.value))}
                          />
                        </td>
                        <td>
                          <span className={`badge ${cat.isActive ? 'badge-success' : 'badge-muted'}`}>
                            {cat.isActive ? '활성' : '비활성'}
                          </span>
                        </td>
                        <td>
                          <div className="action-buttons">
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
                        </td>
                      </>
                    ) : (
                      <>
                        <td>{cat.id}</td>
                        <td className={!cat.isActive ? 'text-strikethrough' : ''}>
                          {cat.categoryName}
                        </td>
                        <td>
                          <span className={`badge ${cat.activityType === 'OFFICIAL' ? 'badge-purple' : 'badge-teal'}`}>
                            {cat.activityType === 'OFFICIAL' ? '공식' : '자율'}
                          </span>
                        </td>
                        <td>{cat.assignedHours}시간</td>
                        <td>
                          <span className={`badge ${cat.isActive ? 'badge-success' : 'badge-muted'}`}>
                            {cat.isActive ? '활성' : '비활성'}
                          </span>
                        </td>
                        <td>
                          <div className="action-buttons">
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
                                  className={`btn btn-sm ${cat.isActive ? 'btn-danger' : 'btn-success'}`}
                                  onClick={() => handleToggleActive(cat)}
                                  disabled={actionLoading}
                                >
                                  {cat.isActive ? '비활성화' : '활성화'}
                                </button>
                                <button
                                  className="btn btn-outline-danger btn-sm"
                                  onClick={() => handleDeleteCategory(cat.id)}
                                  disabled={actionLoading}
                                >
                                  삭제
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
