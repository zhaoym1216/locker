'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { circleApi } from '@/lib/api';

const CIRCLE_TYPE_LABELS: Record<string, string> = {
  INDUSTRY: '行业圈', ALUMNI: '校友圈', INTEREST: '兴趣圈', REGION: '地域圈',
  COMPANY: '企业圈', PROJECT: '项目圈', PAID: '付费圈', PRIVATE: '私密圈',
};

const CIRCLE_TYPE_COLORS: Record<string, string> = {
  INDUSTRY: 'bg-orange-50 text-orange-600',
  ALUMNI: 'bg-green-50 text-green-600',
  INTEREST: 'bg-purple-50 text-purple-600',
  REGION: 'bg-cyan-50 text-cyan-600',
  COMPANY: 'bg-blue-50 text-blue-600',
  PROJECT: 'bg-amber-50 text-amber-600',
  PAID: 'bg-pink-50 text-pink-600',
  PRIVATE: 'bg-gray-50 text-gray-600',
};

type Tab = 'created' | 'joined';

export default function MyCirclesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab: Tab = (searchParams.get('tab') as Tab) || 'created';
  const [created, setCreated] = useState<any[]>([]);
  const [joined, setJoined] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [createdRes, joinedRes]: any = await Promise.all([
        circleApi.myCreated(),
        circleApi.myJoined(),
      ]);
      setCreated(createdRes);
      setJoined(joinedRes);
    } catch {} finally {
      setLoading(false);
    }
  };

  const items = tab === 'created' ? created : joined;

  if (loading) return <div className="flex items-center justify-center py-20 text-gray-400">加载中...</div>;

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">我的圈子</h1>
        <button onClick={() => router.push('/circles/create')}
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-xl hover:bg-blue-700 transition font-medium">
          创建圈子
        </button>
      </div>

      {/* Tab 切换 */}
      <div className="flex gap-1 mb-6 bg-gray-100 rounded-xl p-1">
        <button onClick={() => router.replace('/my-circles?tab=created')}
          className={`flex-1 py-2.5 text-sm rounded-lg font-medium transition ${tab === 'created' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
          我创建的 <span className="ml-1 text-gray-400">{created.length}</span>
        </button>
        <button onClick={() => router.replace('/my-circles?tab=joined')}
          className={`flex-1 py-2.5 text-sm rounded-lg font-medium transition ${tab === 'joined' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
          我加入的 <span className="ml-1 text-gray-400">{joined.length}</span>
        </button>
      </div>

      {/* 圈子列表 */}
      {items.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border p-12 text-center">
          <p className="text-gray-400 mb-4">{tab === 'created' ? '还没有创建圈子' : '还没有加入圈子'}</p>
          {tab === 'created' && (
            <button onClick={() => router.push('/circles/create')}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition font-medium">
              去创建
            </button>
          )}
          {tab === 'joined' && (
            <button onClick={() => router.push('/feed?tab=discover')}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition font-medium">
              去发现
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {items.map((circle: any) => (
            <div key={circle.id}
              onClick={() => router.push(`/circles/${circle.id}`)}
              className="bg-white rounded-2xl shadow-sm border p-5 cursor-pointer hover:shadow-md transition">
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-semibold text-gray-900 text-lg">{circle.name}</h3>
                <span className={`px-2 py-0.5 text-xs font-medium rounded-full shrink-0 ${CIRCLE_TYPE_COLORS[circle.type] || 'bg-blue-50 text-blue-600'}`}>
                  {CIRCLE_TYPE_LABELS[circle.type] || circle.type}
                </span>
              </div>
              {circle.description && (
                <p className="text-sm text-gray-500 mb-3 line-clamp-2">{circle.description}</p>
              )}
              <div className="flex items-center gap-4 text-xs text-gray-400">
                <span>{circle.memberCount ?? circle._count?.members ?? 0} 成员</span>
                <span>{circle._count?.posts ?? 0} 帖子</span>
                {!circle.isPublic && <span className="text-gray-300">私密</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
