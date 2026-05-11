'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { postApi, commentApi } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import { renderContentWithTags } from '@/lib/tags';

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

export default function PostDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, fetchUser, token } = useAuthStore();
  const postId = params.id as string;

  const [post, setPost] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [commentInput, setCommentInput] = useState('');
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editCommentContent, setEditCommentContent] = useState('');
  const [replyingTo, setReplyingTo] = useState<{ commentId: string; nickname: string; parentId: string } | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [extraReplies, setExtraReplies] = useState<Record<string, any[]>>({});
  const [showAllReplies, setShowAllReplies] = useState<Record<string, boolean>>({});

  const [editingPost, setEditingPost] = useState(false);
  const [editPostContent, setEditPostContent] = useState('');
  const [openMenu, setOpenMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!token) { router.push('/login'); return; }
    fetchUser();
    loadPost();
    loadComments();
  }, [token, postId]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpenMenu(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const loadPost = async () => {
    try {
      const res: any = await postApi.get(postId);
      setPost(res);
    } catch (err: any) {
      setError(err?.message || '加载失败');
      setPost(null);
    } finally {
      setLoading(false);
    }
  };

  const loadComments = async () => {
    try {
      const res: any = await commentApi.getByPost(postId);
      setComments(res.items || []);
    } catch {}
  };

  const loadMoreReplies = async (commentId: string) => {
    try {
      const res: any = await commentApi.getReplies(commentId);
      setExtraReplies(prev => ({ ...prev, [commentId]: res.items || [] }));
      setShowAllReplies(prev => ({ ...prev, [commentId]: true }));
    } catch {}
  };

  const handleLikePost = async () => {
    setError('');
    try { await postApi.like(postId); loadPost(); }
    catch (err: any) { setError(err?.message || '点赞失败'); }
  };

  const handleEditPost = async () => {
    if (!editPostContent.trim()) return; setError('');
    try { await postApi.update(postId, editPostContent); setEditingPost(false); loadPost(); }
    catch (err: any) { setError(err?.message || '编辑失败'); }
  };

  const handleDeletePost = async () => {
    if (!confirm('确定要删除这条动态吗？')) return;
    try { await postApi.delete(postId); router.back(); }
    catch (err: any) { setError(err?.message || '删除失败'); }
  };

  const handleComment = async () => {
    const text = commentInput.trim();
    if (!text) return; setError('');
    try {
      await commentApi.create({ postId, content: text });
      setCommentInput('');
      loadComments(); loadPost();
    } catch (err: any) { setError(err?.message || '评论失败'); }
  };

  const handleReply = async () => {
    if (!replyContent.trim() || !replyingTo) return; setError('');
    try {
      await commentApi.create({ postId, content: replyContent, parentId: replyingTo.parentId, replyToId: replyingTo.commentId });
      setReplyContent(''); setReplyingTo(null);
      loadComments();
      if (extraReplies[replyingTo.commentId]) {
        setExtraReplies(prev => { const n = { ...prev }; delete n[replyingTo.commentId]; return n; });
        setShowAllReplies(prev => { const n = { ...prev }; delete n[replyingTo.commentId]; return n; });
      }
      loadPost();
    } catch (err: any) { setError(err?.message || '回复失败'); }
  };

  const handleCommentLike = async (commentId: string) => {
    setError('');
    try { await commentApi.like(commentId); loadComments(); }
    catch (err: any) { setError(err?.message || '点赞失败'); }
  };

  const handleEditComment = async (commentId: string) => {
    if (!editCommentContent.trim()) return; setError('');
    try { await commentApi.update(commentId, editCommentContent); setEditingComment(null); loadComments(); }
    catch (err: any) { setError(err?.message || '编辑失败'); }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('确定要删除这条评论吗？')) return; setError('');
    try { await commentApi.delete(commentId); loadComments(); loadPost(); }
    catch (err: any) { setError(err?.message || '删除失败'); }
  };

  const canEditComment = (c: any) => user && c.userId === user.id;
  const canEditPost = () => user && post && post.userId === user.id;

  const renderComment = (c: any, parentId: string, isReply: boolean = false) => (
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
              onKeyDown={(e) => { if (e.key === 'Enter') handleEditComment(c.id); if (e.key === 'Escape') setEditingComment(null); }} />
            <button onClick={() => handleEditComment(c.id)} className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg">保存</button>
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
              <button onClick={() => handleCommentLike(c.id)} className={`text-xs transition ${c.isLiked ? 'text-red-500' : 'text-gray-400 hover:text-red-500'}`}>
                {c.isLiked ? '已赞' : '赞'} {c.likeCount ?? 0}
              </button>
              <button onClick={() => { setReplyingTo({ commentId: c.id, nickname: c.user.nickname, parentId }); setReplyContent(''); }}
                className="text-xs text-gray-400 hover:text-blue-500 transition">回复</button>
              {canEditComment(c) && (
                <>
                  <button onClick={() => { setEditingComment(c.id); setEditCommentContent(c.content); }} className="text-xs text-gray-400 hover:text-blue-500 transition">编辑</button>
                  <button onClick={() => handleDeleteComment(c.id)} className="text-xs text-gray-400 hover:text-red-500 transition">删除</button>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );

  if (loading) return <div className="flex items-center justify-center py-20 text-gray-400">加载中...</div>;
  if (!post) return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6">
      <div className="bg-white rounded-2xl shadow-sm border p-12 text-center">
        <p className="text-gray-400 mb-4">{error || '帖子不存在或无权访问'}</p>
        <button onClick={() => router.back()} className="px-6 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition">返回</button>
      </div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6">
      <button onClick={() => router.back()} className="mb-4 flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        返回
      </button>

      {error && <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-xl text-sm border border-red-100">{error}</div>}

      <div className="bg-white rounded-2xl shadow-sm border p-6 mb-4">
        <div className="flex items-start gap-3 mb-4">
          <div onClick={() => !post.isAnonymous && router.push(`/users/${post.user.id}`)}
            className={`w-12 h-12 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-medium shrink-0 ${!post.isAnonymous ? 'cursor-pointer hover:ring-2 hover:ring-blue-200 transition' : ''}`}>
            {post.isAnonymous ? '?' : post.user.nickname[0]}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {post.isAnonymous ? (
                <p className="font-medium text-gray-900">匿名用户</p>
              ) : (
                <button onClick={() => router.push(`/users/${post.user.id}`)}
                  className="font-medium text-gray-900 hover:text-blue-600 transition">{post.user.nickname}</button>
              )}
              {post.isPinned && <span className="px-1.5 py-0.5 text-xs font-medium bg-blue-100 text-blue-600 rounded">置顶</span>}
              <button onClick={() => router.push(`/circles/${post.circle.id}`)}
                className={`px-2.5 py-1 text-xs font-medium rounded-full transition ${CIRCLE_TYPE_COLORS[post.circle.type] || 'bg-blue-50 text-blue-600 hover:bg-blue-100'}`}>
                {CIRCLE_TYPE_LABELS[post.circle.type] && <>{CIRCLE_TYPE_LABELS[post.circle.type]} · </>}{post.circle.name}
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-1">{new Date(post.createdAt).toLocaleString()}</p>
          </div>
          {canEditPost() && !editingPost && (
            <div className="relative" ref={openMenu ? menuRef : undefined}>
              <button onClick={() => setOpenMenu(!openMenu)}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                </svg>
              </button>
              {openMenu && (
                <div className="absolute right-0 top-8 w-32 bg-white rounded-xl shadow-lg border py-1 z-20">
                  <button onClick={() => { setEditingPost(true); setEditPostContent(post.content); setOpenMenu(false); }}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition">编辑</button>
                  <button onClick={() => { setOpenMenu(false); handleDeletePost(); }}
                    className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-50 transition">删除</button>
                </div>
              )}
            </div>
          )}
        </div>

        {editingPost ? (
          <div className="mb-4">
            <textarea value={editPostContent} onChange={(e) => setEditPostContent(e.target.value)}
              className="w-full p-3 border border-gray-200 rounded-xl resize-none focus:ring-2 focus:ring-blue-500 outline-none text-gray-800" rows={5} />
            <div className="flex justify-end gap-2 mt-2">
              <button onClick={() => setEditingPost(false)} className="px-4 py-1.5 text-sm text-gray-500 hover:text-gray-700">取消</button>
              <button onClick={handleEditPost} className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">保存</button>
            </div>
          </div>
        ) : (
          <p className="text-gray-800 whitespace-pre-wrap leading-relaxed mb-4">
            {renderContentWithTags(post.content, (name) => router.push(`/tags/${encodeURIComponent(name)}`))}
          </p>
        )}

        <div className="flex items-center gap-6 pt-3 border-t border-gray-100">
          <button onClick={handleLikePost} className={`flex items-center gap-1.5 text-sm transition ${post.isLiked ? 'text-red-500' : 'text-gray-400 hover:text-red-500'}`}>
            <svg className="w-4 h-4" fill={post.isLiked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
            {post.likeCount ?? 0}
          </button>
          <span className="flex items-center gap-1.5 text-sm text-gray-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
            {post._count?.comments ?? 0}
          </span>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">评论 {comments.length > 0 && <span className="text-sm font-normal text-gray-400">({comments.length})</span>}</h2>

        {!replyingTo && (
          <div className="flex gap-2 mb-6">
            <input value={commentInput} onChange={(e) => setCommentInput(e.target.value)} placeholder="写评论..."
              className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              onKeyDown={(e) => { if (e.key === 'Enter') handleComment(); }} />
            <button onClick={handleComment} disabled={!commentInput.trim()}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-xl hover:bg-blue-700 disabled:opacity-50 transition font-medium">发送</button>
          </div>
        )}

        {comments.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm">暂无评论，来抢第一条吧</div>
        ) : (
          <div className="space-y-4">
            {comments.map((c: any) => {
              const topReplies = c.replies || [];
              const replyCount = c._count?.replies || 0;
              const isRepliesExpanded = showAllReplies[c.id];
              const displayReplies = isRepliesExpanded ? (extraReplies[c.id] || topReplies) : topReplies;
              return (
                <div key={c.id}>
                  {renderComment(c, c.id, false)}
                  {displayReplies.length > 0 && (
                    <div className="mt-2 space-y-2">
                      {displayReplies.map((r: any) => renderComment(r, c.id, true))}
                    </div>
                  )}
                  {replyCount > 3 && !isRepliesExpanded && (
                    <button onClick={() => loadMoreReplies(c.id)} className="text-sm text-blue-500 hover:text-blue-600 ml-11 mt-2">展开全部 {replyCount} 条回复</button>
                  )}
                  {isRepliesExpanded && replyCount > 3 && (
                    <button onClick={() => setShowAllReplies(prev => ({ ...prev, [c.id]: false }))} className="text-sm text-blue-500 hover:text-blue-600 ml-11 mt-2">收起回复</button>
                  )}
                  {replyingTo?.parentId === c.id && (
                    <div className="ml-11 mt-3 flex gap-2">
                      <input value={replyContent} onChange={(e) => setReplyContent(e.target.value)}
                        placeholder={`回复 @${replyingTo?.nickname ?? ''}...`}
                        className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        onKeyDown={(e) => { if (e.key === 'Enter') handleReply(); if (e.key === 'Escape') setReplyingTo(null); }}
                        autoFocus />
                      <button onClick={handleReply} disabled={!replyContent.trim()}
                        className="px-4 py-2 bg-blue-600 text-white text-sm rounded-xl hover:bg-blue-700 disabled:opacity-50 transition font-medium">回复</button>
                      <button onClick={() => setReplyingTo(null)} className="px-3 py-2 text-gray-400 text-sm hover:text-gray-600">取消</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
