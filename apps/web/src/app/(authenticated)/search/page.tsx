'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { searchApi } from '@/lib/api';

type SearchType = 'all' | 'user' | 'circle' | 'post';

const TYPE_LABELS: Record<SearchType, string> = {
  all: '综合',
  user: '用户',
  circle: '圈子',
  post: '动态',
};

const CIRCLE_TYPE_LABELS: Record<string, string> = {
  INDUSTRY: '行业圈', ALUMNI: '校友圈', INTEREST: '兴趣圈', REGION: '地域圈',
  COMPANY: '企业圈', PROJECT: '项目圈', PAID: '付费圈', PRIVATE: '私密圈',
};

export default function SearchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const q = searchParams.get('q') || '';
  const typeParam = (searchParams.get('type') as SearchType) || 'all';

  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!q.trim()) { setResults(null); return; }
    setLoading(true);
    const search = async () => {
      try {
        if (typeParam === 'all') {
          const res: any = await searchApi.all(q);
          setResults(res);
        } else if (typeParam === 'user') {
          const res: any = await searchApi.users(q);
          setResults(res);
        } else if (typeParam === 'circle') {
          const res: any = await searchApi.circles(q);
          setResults(res);
        } else {
          const res: any = await searchApi.posts(q);
          setResults(res);
        }
      } catch { setResults(null); }
      finally { setLoading(false); }
    };
    search();
  }, [q, typeParam]);

  const handleTypeChange = (t: SearchType) => {
    router.push(`/search?q=${encodeURIComponent(q)}&type=${t}`);
  };

  const renderUser = (u: any) => (
    <div key={u.id} onClick={() => router.push(`/users/${u.id}`)}
      className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 cursor-pointer transition">
      <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-medium shrink-0">
        {u.nickname?.[0] || '?'}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-900 truncate">{u.nickname}</p>
        <p className="text-xs text-gray-400 truncate">@{u.username}</p>
      </div>
      {u.bio && <p className="text-sm text-gray-500 truncate max-w-xs">{u.bio}</p>}
    </div>
  );

  const renderCircle = (c: any) => (
    <div key={c.id} onClick={() => router.push(`/circles/${c.id}`)}
      className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 cursor-pointer transition">
      <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-teal-500 rounded-full flex items-center justify-center text-white text-sm font-medium shrink-0">
        {c.name?.[0] || '?'}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-900 truncate">{c.name}</p>
        <p className="text-xs text-gray-400">{CIRCLE_TYPE_LABELS[c.type] || c.type} · {c.memberCount} 位成员</p>
      </div>
      {c.description && <p className="text-sm text-gray-500 truncate max-w-xs">{c.description}</p>}
    </div>
  );

  const renderPost = (p: any) => (
    <div key={p.id} onClick={() => router.push(`/posts/${p.id}`)}
      className="p-4 bg-white rounded-xl border hover:shadow-sm cursor-pointer transition">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-sm font-medium text-gray-900">{p.user?.nickname}</span>
        <span className="text-xs text-gray-400">在 {p.circle?.name}</span>
        <span className="text-xs text-gray-300 ml-auto">{new Date(p.createdAt).toLocaleDateString()}</span>
      </div>
      <p className="text-sm text-gray-700 line-clamp-3 whitespace-pre-wrap">{p.content}</p>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6">
      {/* 搜索标题 */}
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">
          {q ? `搜索"${q}"的结果` : '搜索'}
        </h1>
      </div>

      {/* 类型切换 */}
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-xl w-fit">
        {(Object.keys(TYPE_LABELS) as SearchType[]).map((t) => (
          <button key={t} onClick={() => handleTypeChange(t)}
            className={`px-4 py-1.5 text-sm rounded-lg transition ${typeParam === t ? 'bg-white text-gray-900 shadow-sm font-medium' : 'text-gray-500 hover:text-gray-700'}`}>
            {TYPE_LABELS[t]}
          </button>
        ))}
      </div>

      {loading && <div className="text-center py-12 text-gray-400">搜索中...</div>}

      {!loading && !results && q && (
        <div className="text-center py-12 text-gray-400">未找到结果</div>
      )}

      {!loading && !results && !q && (
        <div className="text-center py-12 text-gray-400">输入关键词开始搜索</div>
      )}

      {!loading && results && typeParam === 'all' && (
        <div className="space-y-8">
          {results.users?.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-semibold text-gray-900">用户</h2>
                <button onClick={() => handleTypeChange('user')} className="text-sm text-blue-600 hover:text-blue-700">查看更多</button>
              </div>
              <div className="bg-white rounded-2xl border divide-y divide-gray-50">
                {results.users.map(renderUser)}
              </div>
            </section>
          )}
          {results.circles?.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-semibold text-gray-900">圈子</h2>
                <button onClick={() => handleTypeChange('circle')} className="text-sm text-blue-600 hover:text-blue-700">查看更多</button>
              </div>
              <div className="bg-white rounded-2xl border divide-y divide-gray-50">
                {results.circles.map(renderCircle)}
              </div>
            </section>
          )}
          {results.posts?.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-semibold text-gray-900">动态</h2>
                <button onClick={() => handleTypeChange('post')} className="text-sm text-blue-600 hover:text-blue-700">查看更多</button>
              </div>
              <div className="space-y-3">
                {results.posts.map(renderPost)}
              </div>
            </section>
          )}
          {results.users?.length === 0 && results.circles?.length === 0 && results.posts?.length === 0 && (
            <div className="text-center py-12 text-gray-400">未找到相关结果</div>
          )}
        </div>
      )}

      {!loading && results && typeParam !== 'all' && (
        <div>
          {results.items?.length === 0 ? (
            <div className="text-center py-12 text-gray-400">未找到相关结果</div>
          ) : typeParam === 'user' ? (
            <div className="bg-white rounded-2xl border divide-y divide-gray-50">
              {results.items?.map(renderUser)}
            </div>
          ) : typeParam === 'circle' ? (
            <div className="bg-white rounded-2xl border divide-y divide-gray-50">
              {results.items?.map(renderCircle)}
            </div>
          ) : (
            <div className="space-y-3">
              {results.items?.map(renderPost)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
