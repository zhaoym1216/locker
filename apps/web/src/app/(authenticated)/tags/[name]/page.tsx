'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { tagApi, postApi, commentApi } from '@/lib/api';
import { renderContentWithTags } from '@/lib/tags';

export default function TagDetailPage() {
  const router = useRouter();
  const params = useParams<{ name: string }>();
  const tagName = decodeURIComponent(params.name);

  const [tag, setTag] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [tagName]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [tagRes, postsRes]: any[] = await Promise.all([
        tagApi.get(tagName),
        tagApi.posts(tagName),
      ]);
      setTag(tagRes);
      setPosts(postsRes.items || []);
    } catch {}
    finally { setLoading(false); }
  };

  const handleLike = async (postId: string) => {
    try { await postApi.like(postId); loadData(); } catch {}
  };

  if (loading) return <div className="flex items-center justify-center py-20 text-gray-400">加载中...</div>;

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6">
      {/* 话题头部 */}
      <div className="bg-white rounded-2xl shadow-sm border p-6 mb-6">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-2xl font-bold text-blue-600">#{tagName}</span>
        </div>
        <div className="flex items-center gap-6 text-sm text-gray-500">
          <span>{tag?.postCount ?? 0} 篇动态</span>
          <span>{tag?.participantCount ?? 0} 位参与者</span>
        </div>
      </div>

      {/* 帖子列表 */}
      {posts.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border p-12 text-center">
          <p className="text-gray-400">暂无相关动态</p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post: any) => (
            <div key={post.id} className="bg-white rounded-2xl shadow-sm border p-5">
              <div className="flex items-center gap-3 mb-3">
                <div onClick={() => router.push(`/users/${post.user.id}`)}
                  className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-medium shrink-0 cursor-pointer hover:ring-2 hover:ring-blue-200 transition">
                  {post.user.nickname[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <button onClick={() => router.push(`/users/${post.user.id}`)}
                    className="font-medium text-gray-900 hover:text-blue-600 transition">{post.user.nickname}</button>
                  <p className="text-xs text-gray-400">{new Date(post.createdAt).toLocaleString()}</p>
                </div>
                <button onClick={() => router.push(`/circles/${post.circle.id}`)}
                  className="px-2.5 py-1 text-xs font-medium rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 transition shrink-0">
                  {post.circle.name}
                </button>
              </div>
              <div className="mb-3 text-gray-800 whitespace-pre-wrap leading-relaxed">
                {renderContentWithTags(post.content, (name) => router.push(`/tags/${encodeURIComponent(name)}`))}
              </div>
              <div className="flex items-center gap-6 pt-3 border-t border-gray-100">
                <button onClick={() => handleLike(post.id)}
                  className={`flex items-center gap-1.5 text-sm transition ${post.isLiked ? 'text-red-500' : 'text-gray-400 hover:text-red-500'}`}>
                  <svg className="w-4 h-4" fill={post.isLiked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                  {post.likeCount ?? 0}
                </button>
                <span className="flex items-center gap-1.5 text-sm text-gray-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  {post._count?.comments ?? 0}
                </span>
                <button onClick={() => router.push(`/posts/${post.id}`)} className="ml-auto text-sm text-gray-400 hover:text-blue-500 transition">
                  查看详情 →
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
