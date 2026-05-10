'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { circleApi } from '@/lib/api';

const CIRCLE_TYPES = [
  { value: 'INDUSTRY', label: '行业圈' },
  { value: 'INTEREST', label: '兴趣圈' },
  { value: 'PROJECT', label: '项目圈' },
  { value: 'PAID', label: '付费圈' },
  { value: 'PRIVATE', label: '私密圈' },
];

const AUTH_METHODS = [
  { value: 'EMAIL', label: '企业邮箱认证' },
  { value: 'INVITE_CODE', label: '邀请码' },
  { value: 'APPROVAL', label: '管理员审批' },
  { value: 'CERTIFICATE', label: '证书上传' },
  { value: 'PAYMENT', label: '付费入圈' },
  { value: 'LOCATION', label: '地理位置验证' },
];

export default function EditCirclePage() {
  const params = useParams();
  const router = useRouter();
  const circleId = params.id as string;
  const [form, setForm] = useState({
    name: '',
    description: '',
    type: 'INTEREST',
    authMethods: ['APPROVAL'] as string[],
    isPublic: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [isSystem, setIsSystem] = useState(false);

  useEffect(() => { loadCircle(); }, [circleId]);

  const loadCircle = async () => {
    try {
      const res: any = await circleApi.get(circleId);
      setIsSystem(res.isSystem ?? false);
      setForm({
        name: res.name || '',
        description: res.description || '',
        type: res.type || 'INTEREST',
        authMethods: res.authMethods || ['APPROVAL'],
        isPublic: res.isPublic ?? true,
      });
    } catch (err: any) {
      setError(Array.isArray(err?.message) ? err.message.join('；') : err?.message || '加载失败');
    } finally {
      setLoading(false);
    }
  };

  const toggleAuthMethod = (method: string) => {
    setForm((prev) => ({
      ...prev,
      authMethods: prev.authMethods.includes(method)
        ? prev.authMethods.filter((m) => m !== method)
        : [...prev.authMethods, method],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await circleApi.update(circleId, form);
      router.push(`/circles/${circleId}`);
    } catch (err: any) {
      setError(Array.isArray(err?.message) ? err.message.join('；') : err?.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20 text-gray-400">加载中...</div>;
  }

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6">
        <div className="flex items-center gap-3 mb-6">
          <h1 className="text-2xl font-bold text-gray-900">编辑圈子</h1>
          <span className="text-gray-400">—</span>
          <span className="text-gray-500">{form.name}</span>
        </div>

        {error && <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-xl text-sm border border-red-100">{error}</div>}

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">圈子名称</label>
            <input
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">圈子简介</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">圈子类型</label>
            <div className="grid grid-cols-2 gap-2">
              {CIRCLE_TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, type: t.value }))}
                  className={`px-4 py-2.5 rounded-xl border text-sm transition ${
                    form.type === t.value
                      ? 'bg-blue-50 border-blue-500 text-blue-700 font-medium'
                      : 'border-gray-200 hover:bg-gray-50 text-gray-600'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              入圈认证方式（可多选）
              {isSystem && <span className="ml-2 text-xs text-gray-400 font-normal">系统圈子不可修改</span>}
            </label>
            <div className="grid grid-cols-2 gap-2">
              {AUTH_METHODS.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => !isSystem && toggleAuthMethod(m.value)}
                  disabled={isSystem}
                  className={`px-4 py-2.5 rounded-xl border text-sm transition ${
                    form.authMethods.includes(m.value)
                      ? isSystem
                        ? 'bg-gray-100 border-gray-300 text-gray-500 font-medium cursor-not-allowed'
                        : 'bg-blue-50 border-blue-500 text-blue-700 font-medium'
                      : isSystem
                        ? 'border-gray-100 text-gray-300 cursor-not-allowed'
                        : 'border-gray-200 hover:bg-gray-50 text-gray-600'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <div className={`flex items-center gap-3 ${isSystem ? 'opacity-60' : ''}`}>
            <input
              type="checkbox"
              id="isPublic"
              checked={form.isPublic}
              onChange={(e) => !isSystem && setForm((p) => ({ ...p, isPublic: e.target.checked }))}
              disabled={isSystem}
              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:cursor-not-allowed"
            />
            <label htmlFor="isPublic" className="text-sm text-gray-700">
              公开圈子（可被搜索和发现）
              {isSystem && <span className="ml-2 text-xs text-gray-400">系统圈子不可修改</span>}
            </label>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => router.push(`/circles/${circleId}`)}
              className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 transition font-medium"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={saving || !form.name || form.authMethods.length === 0}
              className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition font-medium"
            >
              {saving ? '保存中...' : '保存修改'}
            </button>
          </div>
        </form>
    </div>
  );
}
