'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';

interface CategoryBreakdown {
  categoryId: number;
  categoryName: string;
  activityType: string;
  hours: number;
  count: number;
}

interface UserData {
  id: number;
  name: string;
  email: string;
  status: 'INVITED' | 'ACTIVE' | 'BANNED';
  role: 'USER' | 'ADMIN';
  officialHours?: number;
  autonomousHours?: number;
  totalApprovedHours?: number;
  categoryBreakdown?: CategoryBreakdown[];
}

export default function UsersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [expandedUser, setExpandedUser] = useState<number | null>(null);

  // Invite form
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState('');

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

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch('/api/users');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setUsers(data);
    } catch {
      setError('사용자 목록을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === 'authenticated' && session?.user?.role === 'ADMIN') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchUsers();
    }
  }, [status, session, fetchUsers]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteName.trim() || !inviteEmail.trim()) return;
    setInviteLoading(true);
    setError('');
    setInviteSuccess('');

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: inviteName.trim(),
          email: inviteEmail.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to invite');
      }

      setInviteName('');
      setInviteEmail('');
      setInviteSuccess(`${inviteEmail.trim()} 초대가 완료되었습니다.`);
      await fetchUsers();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '초대 중 오류가 발생했습니다.');
    } finally {
      setInviteLoading(false);
    }
  };

  const handleStatusChange = async (userId: number, newStatus: 'ACTIVE' | 'BANNED') => {
    setActionLoading(userId);
    setError('');

    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update');
      }

      await fetchUsers();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '상태 변경 중 오류가 발생했습니다.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRoleChange = async (userId: number, newRole: 'ADMIN' | 'USER') => {
    if (newRole === 'USER' && !confirm('정말 관리자 권한을 회수하시겠습니까?')) return;
    if (newRole === 'ADMIN' && !confirm('이 사용자에게 관리자 권한을 부여하시겠습니까?')) return;
    
    setActionLoading(userId);
    setError('');

    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update role');
      }

      await fetchUsers();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '권한 변경 중 오류가 발생했습니다.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteUser = async (userId: number) => {
    if (!confirm('정말로 이 사용자의 계정을 완전히 삭제하시겠습니까?\n이 사용자의 모든 활동 신청 내역도 함께 영구 삭제됩니다.')) return;
    
    setActionLoading(userId);
    setError('');

    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete user');
      }

      await fetchUsers();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '계정 삭제 중 오류가 발생했습니다.');
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadge = (userStatus: string) => {
    switch (userStatus) {
      case 'ACTIVE':
        return <span className="badge badge-success">활성</span>;
      case 'BANNED':
        return <span className="badge badge-danger">정지</span>;
      case 'INVITED':
        return <span className="badge badge-warning">초대됨</span>;
      default:
        return <span className="badge">{userStatus}</span>;
    }
  };

  const getRoleBadge = (role: string) => {
    return role === 'ADMIN' ? (
      <span className="badge badge-purple">관리자</span>
    ) : (
      <span className="badge badge-outline">일반</span>
    );
  };

  if (status === 'loading' || loading) {
    return (
      <>
        <Navbar />
        <div className="container">
          <div className="page-header">
            <h1 className="page-title">사용자 관리</h1>
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
          <h1 className="page-title">사용자 관리</h1>
        </div>

        {error && (
          <div className="alert alert-error">
            <span className="alert-icon">⚠️</span>
            {error}
            <button className="alert-dismiss" onClick={() => setError('')}>✕</button>
          </div>
        )}

        {inviteSuccess && (
          <div className="alert alert-success">
            <span className="alert-icon">✅</span>
            {inviteSuccess}
            <button className="alert-dismiss" onClick={() => setInviteSuccess('')}>✕</button>
          </div>
        )}

        {/* Invite Form */}
        <div className="card" style={{ marginBottom: '2rem' }}>
          <h3 className="card-title">새 사용자 초대</h3>
          <form onSubmit={handleInvite} className="invite-form">
            <div className="form-row">
              <div className="form-group form-group-flex">
                <label className="form-label">이름</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="이름"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  required
                  disabled={inviteLoading}
                />
              </div>
              <div className="form-group form-group-flex">
                <label className="form-label">이메일</label>
                <input
                  type="email"
                  className="form-input"
                  placeholder="email@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  required
                  disabled={inviteLoading}
                />
              </div>
              <div className="form-group form-group-flex form-group-action">
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={inviteLoading || !inviteName.trim() || !inviteEmail.trim()}
                >
                  {inviteLoading ? (
                    <span className="btn-loading">
                      <span className="loading-spinner-sm" />
                    </span>
                  ) : (
                    '초대'
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* User List */}
        <div className="card">
          <h3 className="card-title">
            사용자 목록
            <span className="card-title-count">{users.length}명</span>
          </h3>
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>이름</th>
                  <th>이메일</th>
                  <th>상태</th>
                  <th>역할</th>
                  <th>공식</th>
                  <th>자율</th>
                  <th>합계</th>
                  <th>액션</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const isExpanded = expandedUser === user.id;
                  const breakdown = user.categoryBreakdown || [];
                  const maxHours = breakdown.length > 0 ? Math.max(...breakdown.map((b) => b.hours)) : 1;

                  return (
                    <React.Fragment key={user.id}>
                      <tr
                        className={`${user.status === 'BANNED' ? 'row-inactive' : ''} ${breakdown.length > 0 ? 'row-clickable' : ''}`}
                        onClick={() => breakdown.length > 0 && setExpandedUser(isExpanded ? null : user.id)}
                        style={{ cursor: breakdown.length > 0 ? 'pointer' : 'default' }}
                      >
                        <td className="td-name">
                          {breakdown.length > 0 && (
                            <span style={{ marginRight: '6px', fontSize: '0.75rem', opacity: 0.6, display: 'inline-block', transform: isExpanded ? 'rotate(90deg)' : 'rotate(0)', transition: 'transform 0.2s' }}>▶</span>
                          )}
                          {user.name}
                        </td>
                        <td className="td-email">{user.email}</td>
                        <td>{getStatusBadge(user.status)}</td>
                        <td>{getRoleBadge(user.role)}</td>
                        <td>
                          <span className="badge badge-purple" style={{ fontVariantNumeric: 'tabular-nums' }}>
                            {(user.officialHours ?? 0).toFixed(1)}h
                          </span>
                        </td>
                        <td>
                          <span className="badge badge-teal" style={{ fontVariantNumeric: 'tabular-nums' }}>
                            {(user.autonomousHours ?? 0).toFixed(1)}h
                          </span>
                        </td>
                        <td>
                          <strong style={{ fontVariantNumeric: 'tabular-nums' }}>
                            {(user.totalApprovedHours ?? 0).toFixed(1)}시간
                          </strong>
                        </td>
                        <td>
                          <div className="action-buttons" onClick={(e) => e.stopPropagation()}>
                            {user.role === 'ADMIN' ? (
                              <>
                                <button
                                  className="btn btn-outline btn-sm"
                                  onClick={() => handleRoleChange(user.id, 'USER')}
                                  disabled={actionLoading === user.id || user.email === session?.user?.email}
                                  title={user.email === session?.user?.email ? "본인의 권한은 해제할 수 없습니다" : "관리자 권한 해제"}
                                >
                                  {actionLoading === user.id ? <span className="loading-spinner-sm" /> : '권한 회수'}
                                </button>
                                {user.email !== session?.user?.email && (
                                  <button
                                    className="btn btn-danger btn-sm"
                                    onClick={() => handleDeleteUser(user.id)}
                                    disabled={actionLoading === user.id}
                                    title="계정 완전히 삭제"
                                  >
                                    {actionLoading === user.id ? <span className="loading-spinner-sm" /> : '계정 삭제'}
                                  </button>
                                )}
                              </>
                            ) : user.status === 'ACTIVE' ? (
                              <>
                                <button
                                  className="btn btn-primary btn-sm"
                                  onClick={() => handleRoleChange(user.id, 'ADMIN')}
                                  disabled={actionLoading === user.id}
                                >
                                  {actionLoading === user.id ? <span className="loading-spinner-sm" /> : '관리자 임명'}
                                </button>
                                <button
                                  className="btn btn-danger btn-sm"
                                  onClick={() => handleStatusChange(user.id, 'BANNED')}
                                  disabled={actionLoading === user.id}
                                >
                                  {actionLoading === user.id ? <span className="loading-spinner-sm" /> : '정지'}
                                </button>
                                <button
                                  className="btn btn-outline btn-sm"
                                  style={{ borderColor: 'rgba(239, 68, 68, 0.5)', color: '#ef4444' }}
                                  onClick={() => handleDeleteUser(user.id)}
                                  disabled={actionLoading === user.id}
                                  title="계정 완전히 삭제"
                                >
                                  {actionLoading === user.id ? <span className="loading-spinner-sm" /> : '삭제'}
                                </button>
                              </>
                            ) : user.status === 'BANNED' ? (
                              <>
                                <button
                                  className="btn btn-success btn-sm"
                                  onClick={() => handleStatusChange(user.id, 'ACTIVE')}
                                  disabled={actionLoading === user.id}
                                >
                                  {actionLoading === user.id ? <span className="loading-spinner-sm" /> : '활성화'}
                                </button>
                                <button
                                  className="btn btn-outline btn-sm"
                                  style={{ borderColor: 'rgba(239, 68, 68, 0.5)', color: '#ef4444' }}
                                  onClick={() => handleDeleteUser(user.id)}
                                  disabled={actionLoading === user.id}
                                  title="계정 완전히 삭제"
                                >
                                  {actionLoading === user.id ? <span className="loading-spinner-sm" /> : '삭제'}
                                </button>
                              </>
                            ) : (
                              <>
                                <span className="text-muted" style={{ marginRight: '0.5rem' }}>대기중</span>
                                <button
                                  className="btn btn-outline btn-sm"
                                  style={{ borderColor: 'rgba(239, 68, 68, 0.5)', color: '#ef4444' }}
                                  onClick={() => handleDeleteUser(user.id)}
                                  disabled={actionLoading === user.id}
                                  title="계정 완전히 삭제"
                                >
                                  {actionLoading === user.id ? <span className="loading-spinner-sm" /> : '삭제'}
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                      {isExpanded && breakdown.length > 0 && (
                        <tr className="row-detail">
                          <td colSpan={8} style={{ padding: 0 }}>
                            <div className="user-breakdown-container">
                              <div className="user-breakdown-title">
                                📊 카테고리별 승인 시간 내역
                              </div>
                              <div className="user-breakdown-list">
                                {breakdown.map((cat) => (
                                  <div key={cat.categoryId} className="user-breakdown-row">
                                    <span className="user-breakdown-label">
                                      {cat.categoryName}
                                    </span>
                                    <span className={`badge ${cat.activityType === 'OFFICIAL' ? 'badge-purple' : 'badge-teal'}`}
                                      style={{ fontSize: '0.7rem', flexShrink: 0, minWidth: '36px', textAlign: 'center' }}>
                                      {cat.activityType === 'OFFICIAL' ? '공식' : '자율'}
                                    </span>
                                    <div className="user-breakdown-track">
                                      <div
                                        className={`user-breakdown-fill ${cat.activityType === 'OFFICIAL' ? 'fill-official' : 'fill-autonomous'}`}
                                        style={{ width: `${(cat.hours / maxHours) * 100}%` }}
                                      />
                                    </div>
                                    <span className="user-breakdown-hours">
                                      {cat.hours.toFixed(1)}h
                                    </span>
                                    <span className="user-breakdown-count">
                                      {cat.count}건
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
