'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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

export default function CreateCirclePage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: '',
    description: '',
    type: 'INTEREST',
    authMethods: ['APPROVAL'] as string[],
    isPublic: true,
  });
  const [loading, setLoading] = useState(false);

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
    setLoading(true);
    try {
      const res: any = await circleApi.create(form);
      router.push(`/circles/${res.id}`);
    } catch {} finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">创建圈子</h1>
      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">圈子名称</label>
          <input
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">圈子简介</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
            className="w-full px-4 py-2 border rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:outline-none"
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
                className={`px-4 py-2 rounded-lg border text-sm transition ${
                  form.type === t.value
                    ? 'bg-blue-50 border-blue-500 text-blue-700'
                    : 'hover:bg-gray-50'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">入圈认证方式（可多选）</label>
          <div className="grid grid-cols-2 gap-2">
            {AUTH_METHODS.map((m) => (
              <button
                key={m.value}
                type="button"
                onClick={() => toggleAuthMethod(m.value)}
                className={`px-4 py-2 rounded-lg border text-sm transition ${
                  form.authMethods.includes(m.value)
                    ? 'bg-blue-50 border-blue-500 text-blue-700'
                    : 'hover:bg-gray-50'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="isPublic"
            checked={form.isPublic}
            onChange={(e) => setForm((p) => ({ ...p, isPublic: e.target.checked }))}
            className="rounded"
          />
          <label htmlFor="isPublic" className="text-sm text-gray-700">
            公开圈子（可被搜索和发现）
          </label>
        </div>
        <button
          type="submit"
          disabled={loading || !form.name || form.authMethods.length === 0}
          className="w-full py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition font-medium"
        >
          {loading ? '创建中...' : '创建圈子'}
        </button>
      </form>
    </div>
  );
}
