'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/stores/auth';
import { circleApi, postApi, commentApi } from '@/lib/api';

const CIRCLE_TYPE_LABELS: Record<string, string> = {
  INDUSTRY: '行业圈', ALUMNI: '校友圈', INTEREST: '兴趣圈', REGION: '地域圈',
  COMPANY: '企业圈', PROJECT: '项目圈', PAID: '付费圈', PRIVATE: '私密圈',
};

const CIRCLE_TYPE_COLORS: Record<string, string> = {
  INDUSTRY: 'bg-orange-50 text-orange-600 hover:bg-orange-100',
  ALUMNI: 'bg-green-50 text-green-600 hover:bg-green-100',
  INTEREST: 'bg-purple-50 text-purple-600 hover:bg-purple-100',
  REGION: 'bg-cyan-50 text-cyan-600 hover:bg-cyan-100',
  COMPANY: 'bg-blue-50 text-blue-600 hover:bg-blue-100',
  PROJECT: 'bg-amber-50 text-amber-600 hover:bg-amber-100',
  PAID: 'bg-pink-50 text-pink-600 hover:bg-pink-100',
  PRIVATE: 'bg-gray-50 text-gray-600 hover:bg-gray-100',
};

const STATUS_BADGES: Record<number, { label: string; color: string }> = {
  0: { label: '待审批', color: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
  1: { label: '已加入', color: 'bg-green-50 text-green-700 border-green-200' },
  2: { label: '已拒绝', color: 'bg-red-50 text-red-700 border-red-200' },
  3: { label: '已封禁', color: 'bg-gray-50 text-gray-500 border-gray-200' },
};

type Tab = 'content' | 'discover';

export default function FeedPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, fetchUser, token } = useAuthStore();
  const tab: Tab = (searchParams.get('tab') as Tab) || 'content';
  // 发现
  const [circles, setCircles] = useState<any[]>([]);
  // 内容
  const [posts, setPosts] = useState<any[]>([]);
  const [commentsMap, setCommentsMap] = useState<Record<string, any[]>>({});
  const [expandedMap, setExpandedMap] = useState<Record<string, boolean>>({});
  const [expandedContent, setExpandedContent] = useState<Record<string, boolean>>({});
  const [showCommentArea, setShowCommentArea] = useState<Record<string, boolean>>({});
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editCommentContent, setEditCommentContent] = useState('');
  const [replyingTo, setReplyingTo] = useState<{ commentId: string; nickname: string; parentId: string } | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [extraReplies, setExtraReplies] = useState<Record<string, any[]>>({});
  const [showAllReplies, setShowAllReplies] = useState<Record<string, boolean>>({});
  const [error, setError] = useState('');

  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!token) { router.push('/login'); return; }
    fetchUser();
  }, [token]);

  useEffect(() => {
    if (tab === 'content') loadFeedPosts();
    else loadCircles();
  }, [tab]);

  const loadCircles = async () => {
    try { const res: any = await circleApi.listWithStatus(); setCircles(res.items); }
    catch { try { const res: any = await circleApi.list(); setCircles(res.items); } catch {} }
  };

  const loadFeedPosts = async () => {
    try {
      const res: any = await postApi.getFeed();
      setPosts(res.items);
      loadAllComments(res.items);
    } catch {}
  };

  const loadAllComments = async (postsList: any[]) => {
    const map: Record<string, any[]> = {};
    await Promise.all(postsList.map(async (post: any) => {
      try { const res: any = await commentApi.getByPost(post.id); map[post.id] = res.items || []; }
      catch { map[post.id] = []; }
    }));
    setCommentsMap(map);
  };

  const refreshComments = async (postId: string) => {
    try { const res: any = await commentApi.getByPost(postId); setCommentsMap(prev => ({ ...prev, [postId]: res.items || [] })); } catch {}
  };

  const loadMoreReplies = async (commentId: string) => {
    try { const res: any = await commentApi.getReplies(commentId); setExtraReplies(prev => ({ ...prev, [commentId]: res.items || [] })); setShowAllReplies(prev => ({ ...prev, [commentId]: true })); } catch {}
  };

  const handleLike = async (postId: string) => {
    setError('');
    try { await postApi.like(postId); loadFeedPosts(); }
    catch (err: any) { setError(Array.isArray(err?.message) ? err.message.join('；') : err?.message || '点赞失败'); }
  };

  const handleComment = async (postId: string) => {
    const text = commentInputs[postId]?.trim();
    if (!text) return; setError('');
    try { await commentApi.create({ postId, content: text }); setCommentInputs(prev => ({ ...prev, [postId]: '' })); refreshComments(postId); loadFeedPosts(); }
    catch (err: any) { setError(Array.isArray(err?.message) ? err.message.join('；') : err?.message || '评论失败'); }
  };

  const handleReply = async (postId: string) => {
    if (!replyContent.trim() || !replyingTo) return; setError('');
    try {
      await commentApi.create({ postId, content: replyContent, parentId: replyingTo.parentId, replyToId: replyingTo.commentId });
      setReplyContent(''); setReplyingTo(null); refreshComments(postId);
      if (extraReplies[replyingTo.commentId]) {
        setExtraReplies(prev => { const n = { ...prev }; delete n[replyingTo.commentId]; return n; });
        setShowAllReplies(prev => { const n = { ...prev }; delete n[replyingTo.commentId]; return n; });
      }
      loadFeedPosts();
    } catch (err: any) { setError(Array.isArray(err?.message) ? err.message.join('；') : err?.message || '回复失败'); }
  };

  const handleCommentLike = async (commentId: string, postId: string) => {
    setError('');
    try { await commentApi.like(commentId); refreshComments(postId); }
    catch (err: any) { setError(Array.isArray(err?.message) ? err.message.join('；') : err?.message || '点赞失败'); }
  };

  const handleEditComment = async (commentId: string, postId: string) => {
    if (!editCommentContent.trim()) return; setError('');
    try { await commentApi.update(commentId, editCommentContent); setEditingComment(null); refreshComments(postId); }
    catch (err: any) { setError(Array.isArray(err?.message) ? err.message.join('；') : err?.message || '编辑失败'); }
  };

  const handleDeleteComment = async (commentId: string, postId: string) => {
    if (!confirm('确定要删除这条评论吗？')) return; setError('');
    try { await commentApi.delete(commentId); refreshComments(postId); loadFeedPosts(); }
    catch (err: any) { setError(Array.isArray(err?.message) ? err.message.join('；') : err?.message || '删除失败'); }
  };

  const canEditComment = (c: any) => user && c.userId === user.id;

  const renderComment = (c: any, postId: string, parentId: string, isReply: boolean = false) => (
    <div key={c.id} className={`flex gap-3 ${isReply ? 'ml-11' : ''}`}>
      <div onClick={() => router.push(`/users/${c.user.id}`)}
        className={`${isReply ? 'w-7 h-7' : 'w-8 h-8'} bg-gradient-to-br from-gray-300 to-gray-400 rounded-full flex items-center justify-center text-white text-xs shrink-0 cursor-pointer hover:ring-2 hover:ring-blue-200 transition`}>
        {c.user.nickname[0]}
      </div>
      <div className="flex-1 min-w-0">
        {editingComment === c.id ? (
          <div className="flex gap-2">
            <input value={editCommentContent} onChange={(e) => setEditCommentContent(e.target.value)}
              className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              onKeyDown={(e) => { if (e.key === 'Enter') handleEditComment(c.id, postId); if (e.key === 'Escape') setEditingComment(null); }} />
            <button onClick={() => handleEditComment(c.id, postId)} className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg">保存</button>
            <button onClick={() => setEditingComment(null)} className="px-3 py-1.5 text-gray-500 text-xs rounded-lg">取消</button>
          </div>
        ) : (
          <>
            <p className="text-sm">
              <button onClick={() => router.push(`/users/${c.user.id}`)}
                className="font-medium text-gray-900 hover:text-blue-600 transition">{c.user.nickname}</button>
              {c.replyTo && c.replyToId !== parentId && (
                <span className="text-gray-400"> 回复 <span className="text-gray-600">{c.replyTo.user?.nickname}</span></span>
              )}
              <span className="text-gray-700"> {c.content}</span>
            </p>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              <span className="text-xs text-gray-400">{new Date(c.createdAt).toLocaleString()}</span>
              <button onClick={() => handleCommentLike(c.id, postId)} className={`text-xs transition ${c.isLiked ? 'text-red-500' : 'text-gray-400 hover:text-red-500'}`}>
                {c.isLiked ? '已赞' : '赞'} {c.likeCount ?? 0}
              </button>
              <button onClick={() => { setReplyingTo({ commentId: c.id, nickname: c.user.nickname, parentId }); setReplyContent(''); }}
                className="text-xs text-gray-400 hover:text-blue-500 transition">回复</button>
              {canEditComment(c) && (
                <>
                  <button onClick={() => { setEditingComment(c.id); setEditCommentContent(c.content); }} className="text-xs text-gray-400 hover:text-blue-500 transition">编辑</button>
                  <button onClick={() => handleDeleteComment(c.id, postId)} className="text-xs text-gray-400 hover:text-red-500 transition">删除</button>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );

  if (!user) return <div className="flex items-center justify-center py-20 text-gray-400">加载中...</div>;

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6">
        {error && <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-xl text-sm border border-red-100">{error}</div>}

        {/* 内容 Tab */}
        {tab === 'content' && (
          <div className="space-y-4">
            {posts.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-sm border p-12 text-center">
                <p className="text-gray-400 mb-4">还没有动态</p>
                <button onClick={() => router.push('/feed?tab=discover')} className="px-6 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition font-medium">去发现圈子</button>
              </div>
            ) : posts.map((post: any) => {
              const comments = commentsMap[post.id] || [];
              const commentCount = comments.length || post._count?.comments || 0;
              const hasComments = commentCount > 0;
              const isContentExpanded = expandedContent[post.id];
              const isLongContent = post.content.split('\n').length > 6 || post.content.length > 300;
              const isPostExpanded = expandedMap[post.id];
              const visibleComments = isPostExpanded ? comments : comments.slice(0, 3);
              const isCommentAreaOpen = hasComments || showCommentArea[post.id];

              return (
                <div key={post.id} className="bg-white rounded-2xl shadow-sm border p-5">
                  {/* 帖子头部 */}
                  <div className="flex items-center gap-3 mb-3">
                    <div onClick={() => !post.isAnonymous && router.push(`/users/${post.user.id}`)}
                      className={`w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-medium shrink-0 ${!post.isAnonymous ? 'cursor-pointer hover:ring-2 hover:ring-blue-200 transition' : ''}`}>
                      {post.isAnonymous ? '?' : post.user.nickname[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {post.isAnonymous ? (
                          <p className="font-medium text-gray-900">匿名用户</p>
                        ) : (
                          <button onClick={() => router.push(`/users/${post.user.id}`)}
                            className="font-medium text-gray-900 hover:text-blue-600 transition">
                            {post.user.nickname}
                          </button>
                        )}
                        {post.isPinned && <span className="px-1.5 py-0.5 text-xs font-medium bg-blue-100 text-blue-600 rounded">置顶</span>}
                      </div>
                      <p className="text-xs text-gray-400">{new Date(post.createdAt).toLocaleString()}</p>
                    </div>
                    {/* 圈子标签 */}
                    <button onClick={() => router.push(`/circles/${post.circle.id}`)}
                      className={`px-2.5 py-1 text-xs font-medium rounded-full transition shrink-0 ${CIRCLE_TYPE_COLORS[post.circle.type] || 'bg-blue-50 text-blue-600 hover:bg-blue-100'}`}>
                      {CIRCLE_TYPE_LABELS[post.circle.type] && <>{CIRCLE_TYPE_LABELS[post.circle.type]} · </>}{post.circle.name}
                    </button>
                  </div>

                  {/* 帖子内容 */}
                  <div className="mb-3">
                    <p className={`text-gray-800 whitespace-pre-wrap leading-relaxed ${!isContentExpanded && isLongContent ? 'line-clamp-6' : ''}`}>{post.content}</p>
                    {isLongContent && (
                      <button onClick={() => setExpandedContent(prev => ({ ...prev, [post.id]: !prev[post.id] }))}
                        className="text-sm text-blue-500 hover:text-blue-600 mt-1">
                        {isContentExpanded ? '收起' : '展开全文'}
                      </button>
                    )}
                  </div>

                  {/* 操作栏 */}
                  <div className="flex items-center gap-6 pt-3 border-t border-gray-100">
                    <button onClick={() => handleLike(post.id)} className={`flex items-center gap-1.5 text-sm transition ${post.isLiked ? 'text-red-500' : 'text-gray-400 hover:text-red-500'}`}>
                      <svg className="w-4 h-4" fill={post.isLiked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                      {post.likeCount ?? 0}
                    </button>
                    <button onClick={() => {
                      if (!hasComments && !showCommentArea[post.id]) setShowCommentArea(prev => ({ ...prev, [post.id]: true }));
                      else if (!hasComments && showCommentArea[post.id]) { setShowCommentArea(prev => ({ ...prev, [post.id]: false })); setReplyingTo(null); }
                    }} className={`flex items-center gap-1.5 text-sm transition ${isCommentAreaOpen ? 'text-blue-500' : 'text-gray-400 hover:text-blue-500'}`}>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                      {commentCount > 0 ? commentCount : '评论'}
                    </button>
                    <button onClick={() => router.push(`/posts/${post.id}`)} className="ml-auto text-sm text-gray-400 hover:text-blue-500 transition">
                      查看详情 →
                    </button>
                  </div>

                  {/* 评论区 */}
                  {isCommentAreaOpen && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      {hasComments && (
                        <div className="space-y-3 mb-4">
                          {visibleComments.map((c: any) => {
                            const topReplies = c.replies || [];
                            const replyCount = c._count?.replies || 0;
                            const isRepliesExpanded = showAllReplies[c.id];
                            const displayReplies = isRepliesExpanded ? (extraReplies[c.id] || topReplies) : topReplies;
                            return (
                              <div key={c.id}>
                                {renderComment(c, post.id, c.id, false)}
                                {displayReplies.length > 0 && (
                                  <div className="mt-2 space-y-2">{displayReplies.map((r: any) => renderComment(r, post.id, c.id, true))}</div>
                                )}
                                {replyCount > 3 && !isRepliesExpanded && (
                                  <button onClick={() => loadMoreReplies(c.id)} className="text-sm text-blue-500 hover:text-blue-600 ml-11 mt-2">展开全部 {replyCount} 条回复</button>
                                )}
                                {isRepliesExpanded && replyCount > 3 && (
                                  <button onClick={() => setShowAllReplies(prev => ({ ...prev, [c.id]: false }))} className="text-sm text-blue-500 hover:text-blue-600 ml-11 mt-2">收起回复</button>
                                )}
                                {replyingTo?.parentId === c.id && (
                                  <div className="ml-11 mt-3 flex gap-2">
                                    <input value={replyContent} onChange={(e) => setReplyContent(e.target.value)} placeholder={`回复 @${replyingTo.nickname}...`}
                                      className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                      onKeyDown={(e) => { if (e.key === 'Enter') handleReply(post.id); if (e.key === 'Escape') setReplyingTo(null); }} autoFocus />
                                    <button onClick={() => handleReply(post.id)} disabled={!replyContent.trim()}
                                      className="px-4 py-2 bg-blue-600 text-white text-sm rounded-xl hover:bg-blue-700 disabled:opacity-500 transition font-medium">回复</button>
                                    <button onClick={() => setReplyingTo(null)} className="px-3 py-2 text-gray-400 text-sm hover:text-gray-600">取消</button>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                          {comments.length > 3 && !isPostExpanded && (
                            <button onClick={() => setExpandedMap(prev => ({ ...prev, [post.id]: true }))} className="text-sm text-blue-500 hover:text-blue-600">展开全部 {comments.length} 条评论</button>
                          )}
                          {isPostExpanded && comments.length > 3 && (
                            <button onClick={() => setExpandedMap(prev => ({ ...prev, [post.id]: false }))} className="text-sm text-blue-500 hover:text-blue-600">收起评论</button>
                          )}
                        </div>
                      )}
                      {!replyingTo && (
                        <div className="flex gap-2">
                          <input value={commentInputs[post.id] || ''} onChange={(e) => setCommentInputs(prev => ({ ...prev, [post.id]: e.target.value }))} placeholder="写评论..."
                            className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            onKeyDown={(e) => { if (e.key === 'Enter') handleComment(post.id); }} />
                          <button onClick={() => handleComment(post.id)} disabled={!commentInputs[post.id]?.trim()}
                            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-xl hover:bg-blue-700 disabled:opacity-50 transition font-medium">发送</button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* 发现 Tab */}
        {tab === 'discover' && (
          <div>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-gray-900">发现圈子</h2>
              <button onClick={() => router.push('/circles/create')}
                className="px-5 py-2 bg-blue-600 text-white text-sm rounded-xl hover:bg-blue-700 transition font-medium">创建圈子</button>
            </div>
            {circles.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-sm border p-12 text-center">
                <p className="text-gray-400 mb-4">还没有圈子</p>
                <button onClick={() => router.push('/circles/create')}
                  className="px-6 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition font-medium">创建第一个圈子</button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {circles.map((circle: any) => (
                  <div key={circle.id} className="bg-white rounded-2xl shadow-sm border p-5 hover:shadow-md transition cursor-pointer"
                    onClick={() => router.push(`/circles/${circle.id}`)}>
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-gray-900 text-lg">{circle.name}</h3>
                      {circle.memberStatus != null && STATUS_BADGES[circle.memberStatus] && (
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${STATUS_BADGES[circle.memberStatus].color}`}>
                          {STATUS_BADGES[circle.memberStatus].label}
                        </span>
                      )}
                    </div>
                    {circle.description && <p className="text-gray-500 text-sm mb-3 line-clamp-2 leading-relaxed">{circle.description}</p>}
                    <div className="flex items-center gap-3">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                        {CIRCLE_TYPE_LABELS[circle.type] || circle.type}
                      </span>
                      <span className="text-xs text-gray-400">{circle.memberCount} 位成员</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
    </div>
  );
}
