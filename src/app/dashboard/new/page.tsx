'use client';

import { useState, useEffect } from 'react';
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
  const isEtc = selectedCategory?.categoryName === '기타';

  const handleFileChange = (selectedFile: File | null) => {
    if (selectedFile) {
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
    if (description.length < 5) {
      setError('활동 설명은 5자 이상 입력해주세요.');
      return;
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
                <select
                  id="category"
                  className="form-select"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value ? Number(e.target.value) : '')}
                  required
                  disabled={loading}
                >
                  <option value="">카테고리를 선택하세요</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.categoryName}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Selected category info */}
            {selectedCategory && (
              <div className="category-info">
                {isEtc ? (
                  <div className="alert alert-info">
                    <span className="alert-icon">ℹ️</span>
                    관리자가 활동 유형과 시간을 배정합니다
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
                      }}
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <div className="file-upload-placeholder">
                    <span className="file-upload-icon">📁</span>
                    <p>파일을 드래그하거나 클릭하여 업로드</p>
                    <span className="file-upload-hint">이미지, PDF 등</span>
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
                disabled={loading || !categoryId || description.length < 10}
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
