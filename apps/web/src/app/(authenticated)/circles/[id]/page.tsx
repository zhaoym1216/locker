'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { circleApi, postApi, commentApi } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';

const CIRCLE_TYPE_LABELS: Record<string, string> = {
  INDUSTRY: '行业圈', ALUMNI: '校友圈', INTEREST: '兴趣圈', REGION: '地域圈',
  COMPANY: '企业圈', PROJECT: '项目圈', PAID: '付费圈', PRIVATE: '私密圈',
};

export default function CircleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, fetchUser, token } = useAuthStore();
  const circleId = params.id as string;
  const [circle, setCircle] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [memberStatus, setMemberStatus] = useState<number | null>(null);
  const [memberRole, setMemberRole] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [error, setError] = useState('');
  // 评论
  const [commentsMap, setCommentsMap] = useState<Record<string, any[]>>({});
  const [expandedMap, setExpandedMap] = useState<Record<string, boolean>>({});
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editCommentContent, setEditCommentContent] = useState('');
  // 回复
  const [replyingTo, setReplyingTo] = useState<{ commentId: string; nickname: string; parentId: string } | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [extraReplies, setExtraReplies] = useState<Record<string, any[]>>({});
  const [showAllReplies, setShowAllReplies] = useState<Record<string, boolean>>({});
  // 帖子菜单 & 编辑
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [editingPost, setEditingPost] = useState<string | null>(null);
  const [editPostContent, setEditPostContent] = useState('');
  // 帖子内容展开 & 评论区展开
  const [expandedContent, setExpandedContent] = useState<Record<string, boolean>>({});
  const [showCommentArea, setShowCommentArea] = useState<Record<string, boolean>>({});
  // 邀请码
  const [inviteCode, setInviteCode] = useState('');
  const [showInviteInput, setShowInviteInput] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => { fetchUser(); loadData(); }, [circleId]);
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpenMenu(null);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const isAdmin = memberRole === 'OWNER' || memberRole === 'ADMIN';

  const loadData = async () => {
    setError('');
    try {
      const circleRes: any = await circleApi.get(circleId);
      setCircle(circleRes);
      let currentStatus: number | null = null;
      let currentRole: string | null = null;
      try {
        const statusRes: any = await circleApi.getMyStatus(circleId);
        currentStatus = statusRes.status;
        currentRole = statusRes.role;
        setMemberStatus(currentStatus);
        setMemberRole(currentRole);
      } catch { setMemberStatus(null); setMemberRole(null); }
      if (currentStatus === 1) {
        const postsRes: any = await postApi.getByCircle(circleId);
        setPosts(postsRes.items);
        loadAllComments(postsRes.items);
      }
    } catch { setCircle(null); } finally { setLoading(false); }
  };

  const loadPosts = async () => {
    try {
      const postsRes: any = await postApi.getByCircle(circleId);
      setPosts(postsRes.items);
      loadAllComments(postsRes.items);
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
    try {
      const res: any = await commentApi.getReplies(commentId);
      setExtraReplies(prev => ({ ...prev, [commentId]: res.items || [] }));
      setShowAllReplies(prev => ({ ...prev, [commentId]: true }));
    } catch {}
  };

  const handleJoin = async () => {
    const needInviteCode = circle?.authMethods?.includes('INVITE_CODE');
    if (needInviteCode && !showInviteInput) {
      setShowInviteInput(true);
      return;
    }
    if (needInviteCode && !inviteCode.trim()) {
      setError('请输入邀请码');
      return;
    }
    setJoining(true); setError('');
    try {
      await circleApi.join(circleId, needInviteCode ? inviteCode.trim() : undefined);
      const statusRes: any = await circleApi.getMyStatus(circleId);
      setMemberStatus(statusRes.status); setMemberRole(statusRes.role);
      if (statusRes.status === 1) loadPosts();
    } catch (err: any) { setError(Array.isArray(err?.message) ? err.message.join('；') : err?.message || '加入失败'); }
    finally { setJoining(false); }
  };

  const handleLeave = async () => {
    if (!confirm('确定要退出该圈子吗？')) return;
    setLeaving(true); setError('');
    try { await circleApi.leave(circleId); setMemberStatus(null); setMemberRole(null); setPosts([]); setCommentsMap({}); }
    catch (err: any) { setError(Array.isArray(err?.message) ? err.message.join('；') : err?.message || '退出失败'); }
    finally { setLeaving(false); }
  };

  const handlePost = async () => {
    if (!content.trim()) return; setError('');
    try { await postApi.create({ circleId, content }); setContent(''); loadPosts(); }
    catch (err: any) { setError(Array.isArray(err?.message) ? err.message.join('；') : err?.message || '发布失败'); }
  };

  const handleLike = async (postId: string) => {
    setError('');
    try { await postApi.like(postId); loadPosts(); }
    catch (err: any) { setError(Array.isArray(err?.message) ? err.message.join('；') : err?.message || '点赞失败'); }
  };

  const handleEditPost = async (postId: string) => {
    if (!editPostContent.trim()) return; setError('');
    try { await postApi.update(postId, editPostContent); setEditingPost(null); loadPosts(); }
    catch (err: any) { setError(Array.isArray(err?.message) ? err.message.join('；') : err?.message || '编辑失败'); }
  };

  const handleDeletePost = async (postId: string) => {
    if (!confirm('确定要删除这条动态吗？')) return; setError('');
    try { await postApi.delete(postId); loadPosts(); }
    catch (err: any) { setError(Array.isArray(err?.message) ? err.message.join('；') : err?.message || '删除失败'); }
  };

  const handlePinPost = async (postId: string, pinned: boolean) => {
    setError(''); setOpenMenu(null);
    try { await postApi.pin(postId, pinned); loadPosts(); }
    catch (err: any) { setError(Array.isArray(err?.message) ? err.message.join('；') : err?.message || '操作失败'); }
  };

  const handleComment = async (postId: string) => {
    const text = commentInputs[postId]?.trim();
    if (!text) return; setError('');
    try {
      await commentApi.create({ postId, content: text });
      setCommentInputs(prev => ({ ...prev, [postId]: '' }));
      refreshComments(postId); loadPosts();
    } catch (err: any) { setError(Array.isArray(err?.message) ? err.message.join('；') : err?.message || '评论失败'); }
  };

  const handleReply = async (postId: string) => {
    if (!replyContent.trim() || !replyingTo) return; setError('');
    try {
      await commentApi.create({ postId, content: replyContent, parentId: replyingTo.parentId, replyToId: replyingTo.commentId });
      setReplyContent(''); setReplyingTo(null);
      refreshComments(postId);
      if (extraReplies[replyingTo.commentId]) {
        setExtraReplies(prev => { const n = { ...prev }; delete n[replyingTo.commentId]; return n; });
        setShowAllReplies(prev => { const n = { ...prev }; delete n[replyingTo.commentId]; return n; });
      }
      loadPosts();
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
    try { await commentApi.delete(commentId); refreshComments(postId); loadPosts(); }
    catch (err: any) { setError(Array.isArray(err?.message) ? err.message.join('；') : err?.message || '删除失败'); }
  };

  const canEditComment = (c: any) => {
    if (!user) return false;
    return c.userId === user.id || isAdmin;
  };

  if (loading) return <div className="flex items-center justify-center py-20 text-gray-400">加载中...</div>;
  if (!circle) return <div className="flex items-center justify-center py-20 text-gray-400">圈子不存在</div>;

  const isMember = memberStatus === 1;
  const isPending = memberStatus === 0;

  const renderComment = (c: any, postId: string, parentId: string, isReply: boolean = false) => (
    <div key={c.id} className={`flex gap-3 group ${isReply ? 'ml-11' : ''}`}>
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

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6">
        {/* 圈子信息 */}
        <div className="bg-white rounded-2xl shadow-sm border p-6 mb-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900">{circle.name}</h1>
              {circle.description && <p className="text-gray-500 mt-2 leading-relaxed">{circle.description}</p>}
              <div className="flex flex-wrap items-center gap-3 mt-4">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                  {CIRCLE_TYPE_LABELS[circle.type] || circle.type}
                </span>
                <span className="text-sm text-gray-400">{circle.memberCount} 位成员</span>
                {isMember && <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700">已加入</span>}
                {isPending && <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-50 text-yellow-700">待审批</span>}
              </div>
            </div>
            <div className="flex gap-2 ml-4">
              {isMember && isAdmin && (
                <>
                  <button onClick={() => router.push(`/circles/${circleId}/edit`)} className="px-4 py-2 text-sm border border-gray-200 rounded-xl hover:bg-gray-50 transition">编辑</button>
                  <button onClick={() => router.push(`/circles/${circleId}/manage`)} className="px-4 py-2 text-sm border border-gray-200 rounded-xl hover:bg-gray-50 transition">管理</button>
                </>
              )}
            </div>
          </div>
        </div>

        {error && <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-xl text-sm border border-red-100">{error}</div>}

        {memberStatus === null && (
          <div className="bg-white rounded-2xl shadow-sm border p-8 mb-4 text-center">
            <p className="text-gray-500 mb-4">加入圈子后即可查看动态、发布内容</p>
            {showInviteInput && (
              <div className="mb-4 max-w-xs mx-auto">
                <input
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  placeholder="请输入邀请码"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-center text-lg tracking-widest uppercase focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                />
              </div>
            )}
            <button onClick={handleJoin} disabled={joining} className="px-8 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition font-medium">
              {joining ? '加入中...' : showInviteInput ? '验证加入' : '申请加入'}
            </button>
          </div>
        )}

        {isPending && (
          <div className="bg-yellow-50 rounded-2xl p-6 mb-4 text-center border border-yellow-100">
            <p className="text-yellow-700 font-medium">已提交加入申请，请等待圈主或管理员审批</p>
          </div>
        )}

        {memberStatus === 2 && (
          <div className="bg-white rounded-2xl shadow-sm border p-6 mb-4 text-center">
            <p className="text-red-600 mb-3">你的加入申请已被拒绝</p>
            <button onClick={handleJoin} disabled={joining} className="px-6 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition">
              {joining ? '提交中...' : '重新申请'}
            </button>
          </div>
        )}

        {memberStatus === 3 && (
          <div className="bg-red-50 rounded-2xl p-6 mb-4 text-center border border-red-100">
            <p className="text-red-700 font-medium">你已被封禁，无法访问该圈子</p>
          </div>
        )}

        {isMember && (
          <>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">圈子动态</h2>
              {memberRole !== 'OWNER' && (
                <button onClick={handleLeave} disabled={leaving} className="px-3 py-1.5 text-sm text-red-500 border border-red-200 rounded-xl hover:bg-red-50 transition">
                  {leaving ? '退出中...' : '退出圈子'}
                </button>
              )}
            </div>

            {/* 发帖 */}
            <div className="bg-white rounded-2xl shadow-sm border p-4 mb-4">
              <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="分享你的想法..."
                className="w-full p-3 border border-gray-200 rounded-xl resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition" rows={3} />
              <div className="flex justify-end mt-3">
                <button onClick={handlePost} disabled={!content.trim()} className="px-5 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition font-medium text-sm">发布</button>
              </div>
            </div>

            {/* 帖子列表 */}
            <div className="space-y-4">
              {posts.map((post: any) => {
                const comments = commentsMap[post.id] || [];
                const isPostExpanded = expandedMap[post.id];
                const visibleComments = isPostExpanded ? comments : comments.slice(0, 3);
                const commentCount = comments.length || post._count?.comments || 0;
                const hasComments = commentCount > 0;
                const isContentExpanded = expandedContent[post.id];
                const contentLines = post.content.split('\n');
                const isLongContent = contentLines.length > 6 || post.content.length > 300;
                const displayContent = !isLongContent || isContentExpanded
                  ? post.content
                  : contentLines.slice(0, 6).join('\n') + (contentLines.length > 6 ? '' : post.content.slice(0, 300));
                const isCommentAreaOpen = hasComments || showCommentArea[post.id];

                return (
                  <div key={post.id} className={`bg-white rounded-2xl shadow-sm border p-5 ${post.isPinned ? 'ring-1 ring-blue-200 bg-blue-50/30' : ''}`}>
                    {/* 帖子头部 */}
                    <div className="flex items-start gap-3 mb-3">
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
                              className="font-medium text-gray-900 hover:text-blue-600 transition">{post.user.nickname}</button>
                          )}
                          {post.isPinned && (
                            <span className="px-1.5 py-0.5 text-xs font-medium bg-blue-100 text-blue-600 rounded">置顶</span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400">{new Date(post.createdAt).toLocaleString()}</p>
                      </div>

                      {/* ... 菜单 */}
                      {(post.userId === user?.id || isAdmin) && (
                        <div className="relative" ref={openMenu === post.id ? menuRef : undefined}>
                          <button onClick={() => setOpenMenu(openMenu === post.id ? null : post.id)}
                            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition">
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                            </svg>
                          </button>
                          {openMenu === post.id && (
                            <div className="absolute right-0 top-8 w-36 bg-white rounded-xl shadow-lg border py-1 z-20">
                              {isAdmin && (
                                <button onClick={() => { handlePinPost(post.id, !post.isPinned); }}
                                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition">
                                  {post.isPinned ? '取消置顶' : '置顶'}
                                </button>
                              )}
                              <button onClick={() => { setEditingPost(post.id); setEditPostContent(post.content); setOpenMenu(null); }}
                                className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition">编辑</button>
                              <button onClick={() => { setOpenMenu(null); handleDeletePost(post.id); }}
                                className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-50 transition">删除</button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* 帖子内容 / 编辑模式 */}
                    {editingPost === post.id ? (
                      <div className="mb-3">
                        <textarea value={editPostContent} onChange={(e) => setEditPostContent(e.target.value)}
                          className="w-full p-3 border border-gray-200 rounded-xl resize-none focus:ring-2 focus:ring-blue-500 outline-none text-gray-800" rows={3} />
                        <div className="flex justify-end gap-2 mt-2">
                          <button onClick={() => setEditingPost(null)} className="px-4 py-1.5 text-sm text-gray-500 hover:text-gray-700">取消</button>
                          <button onClick={() => handleEditPost(post.id)} className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">保存</button>
                        </div>
                      </div>
                    ) : (
                      <div className="mb-3">
                        <p className={`text-gray-800 whitespace-pre-wrap leading-relaxed ${!isContentExpanded && isLongContent ? 'line-clamp-6' : ''}`}>{post.content}</p>
                        {isLongContent && (
                          <button onClick={() => setExpandedContent(prev => ({ ...prev, [post.id]: !prev[post.id] }))}
                            className="text-sm text-blue-500 hover:text-blue-600 mt-1">
                            {isContentExpanded ? '收起' : '展开全文'}
                          </button>
                        )}
                      </div>
                    )}

                    {/* 操作栏 */}
                    <div className="flex items-center gap-6 pt-3 border-t border-gray-100">
                      <button onClick={() => handleLike(post.id)} className={`flex items-center gap-1.5 text-sm transition ${post.isLiked ? 'text-red-500' : 'text-gray-400 hover:text-red-500'}`}>
                        <svg className="w-4 h-4" fill={post.isLiked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                        {post.likeCount ?? 0}
                      </button>
                      <button onClick={() => {
                        if (!hasComments && !showCommentArea[post.id]) {
                          setShowCommentArea(prev => ({ ...prev, [post.id]: true }));
                        } else if (!hasComments && showCommentArea[post.id]) {
                          setShowCommentArea(prev => ({ ...prev, [post.id]: false }));
                          setReplyingTo(null);
                        }
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
                        {hasComments ? (
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
                                    <div className="mt-2 space-y-2">
                                      {displayReplies.map((r: any) => renderComment(r, post.id, c.id, true))}
                                    </div>
                                  )}
                                  {replyCount > 3 && !isRepliesExpanded && (
                                    <button onClick={() => loadMoreReplies(c.id)} className="text-sm text-blue-500 hover:text-blue-600 ml-11 mt-2">展开全部 {replyCount} 条回复</button>
                                  )}
                                  {isRepliesExpanded && replyCount > 3 && (
                                    <button onClick={() => { setShowAllReplies(prev => ({ ...prev, [c.id]: false })); }} className="text-sm text-blue-500 hover:text-blue-600 ml-11 mt-2">收起回复</button>
                                  )}
                                  {replyingTo?.parentId === c.id && (
                                    <div className="ml-11 mt-3 flex gap-2">
                                      <input value={replyContent} onChange={(e) => setReplyContent(e.target.value)}
                                        placeholder={`回复 @${replyingTo?.nickname ?? ''}...`}
                                        className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                        onKeyDown={(e) => { if (e.key === 'Enter') handleReply(post.id); if (e.key === 'Escape') setReplyingTo(null); }}
                                        autoFocus />
                                      <button onClick={() => handleReply(post.id)} disabled={!replyContent.trim()}
                                        className="px-4 py-2 bg-blue-600 text-white text-sm rounded-xl hover:bg-blue-700 disabled:opacity-50 transition font-medium">回复</button>
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
                        ) : null}
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
              {posts.length === 0 && <div className="text-center py-16 text-gray-400">还没有动态，来发布第一条吧</div>}
            </div>
          </>
        )}
    </div>
  );
}
