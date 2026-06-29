'use client';

import { useState, useEffect } from 'react';
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

export default function NewRequestPage() {
  const { status } = useSession();
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState<number | ''>('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [customHours, setCustomHours] = useState<number>(1);
  const [activityDate, setActivityDate] = useState(new Date().toISOString().slice(0, 10));

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await fetch('/api/categories?active=true');
        if (!res.ok) throw new Error('Failed to fetch');
        const data = await res.json();
        setCategories(data);
      } catch {
        setError('카테고리를 불러오는 중 오류가 발생했습니다.');
      } finally {
        setCategoriesLoading(false);
      }
    };
    if (status === 'authenticated') {
      fetchCategories();
    }
  }, [status]);

  const selectedCategory = categories.find((c) => c.id === categoryId);
  const isEtc = selectedCategory?.assignedHours === 0;

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!categoryId) {
      setError('카테고리를 선택해주세요.');
      return;
    }
    if (!activityDate) {
      setError('활동 날짜를 입력해주세요.');
      return;
    }
    if (description.length < 5) {
      setError('활동 설명은 5자 이상 입력해주세요.');
      return;
    }
    if (isEtc) {
      if (isNaN(customHours) || customHours <= 0) {
        setError('신청 시간을 0.5시간 단위로 올바르게 입력해주세요.');
        return;
      }
      if (selectedCategory?.maxHours !== null && selectedCategory?.maxHours !== undefined && customHours > selectedCategory.maxHours) {
        setError(`신청 시간은 최대 ${selectedCategory.maxHours}시간을 초과할 수 없습니다.`);
        return;
      }
    }

    setLoading(true);

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

      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryId: Number(categoryId),
          description,
          evidenceFileUrl: evidenceUrl,
          appliedHours: isEtc ? Number(customHours) : undefined,
          activityDate,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to submit');
      }

      router.push('/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '활동 신청 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading') {
    return (
      <>
        <Navbar />
        <div className="container">
          <div className="loading-spinner" />
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="container container-sm">
        <div className="page-header">
          <h1 className="page-title">활동 신청</h1>
        </div>

        <div className="glass-card form-card">
          <form onSubmit={handleSubmit}>
            {error && (
              <div className="alert alert-error">
                <span className="alert-icon">⚠️</span>
                {error}
              </div>
            )}

            {/* Category Select */}
            <div className="form-group">
              <label htmlFor="category" className="form-label">카테고리</label>
              {categoriesLoading ? (
                <div className="skeleton skeleton-input" />
              ) : (
                <CustomDropdown
                  categories={categories}
                  categoryId={categoryId as number}
                  setCategoryId={setCategoryId}
                  disabled={loading}
                />
              )}
            </div>

            {/* Selected category info */}
            {selectedCategory && (
              <div className="category-info">
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
                      <label htmlFor="customHours" className="form-label">신청 시간</label>
                      <input
                        type="number"
                        id="customHours"
                        className="form-input"
                        min={0.5}
                        max={selectedCategory.maxHours !== null && selectedCategory.maxHours !== undefined ? selectedCategory.maxHours : undefined}
                        step={0.5}
                        value={customHours}
                        onChange={(e) => setCustomHours(parseFloat(e.target.value) || 0)}
                        required
                        disabled={loading}
                        style={{ background: 'rgba(5,5,8,0.3)', border: '1px solid rgba(255,255,255,0.06)' }}
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
            )}



            {/* Activity Date */}
            <div className="form-group">
              <label htmlFor="activityDate" className="form-label">활동 날짜</label>
              <input
                type="date"
                id="activityDate"
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
                disabled={loading}
                required
                style={{ background: 'rgba(5,5,8,0.3)', border: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer' }}
              />
            </div>

            {/* Description */}
            <div className="form-group">
              <label htmlFor="description" className="form-label">활동 설명</label>
              <textarea
                id="description"
                className="form-textarea"
                placeholder="활동 내용을 상세하게 작성해주세요 (최소 5자)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={5}
                required
                minLength={5}
                disabled={loading}
              />
              <span className="form-hint">
                {description.length}/5 자 이상
              </span>
            </div>

            {/* File Upload */}
            <div className="form-group">
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
                  disabled={loading}
                />
              </div>
            </div>

            {/* Submit */}
            <div className="form-actions">
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => router.back()}
                disabled={loading}
              >
                취소
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading || !categoryId || description.length < 5}
              >
                {loading ? (
                  <span className="btn-loading">
                    <span className="loading-spinner-sm" />
                    신청 중...
                  </span>
                ) : (
                  '활동 신청'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
