'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/stores/auth';
import { userApi, followApi, postApi, circleApi, verificationApi } from '@/lib/api';
import { renderContentWithTags } from '@/lib/tags';

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

type Tab = 'posts' | 'circles' | 'followers' | 'following' | 'verify';
type VerifyTab = 'email' | 'location';
type CircleTab = 'created' | 'joined';

export default function UserProfilePage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const { user: me, token } = useAuthStore();

  const userId = params.id;
  const tab: Tab = (searchParams.get('tab') as Tab) || 'posts';
  const isSelf = !!me && me.id === userId;

  const [profile, setProfile] = useState<any>(null);
  const [status, setStatus] = useState<{ isFollowing: boolean; isFollowedByMe: boolean } | null>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [createdCircles, setCreatedCircles] = useState<any[]>([]);
  const [joinedCircles, setJoinedCircles] = useState<any[]>([]);
  const [publicCircles, setPublicCircles] = useState<any[]>([]);
  const [circleTab, setCircleTab] = useState<CircleTab>('created');
  const [followers, setFollowers] = useState<any[]>([]);
  const [following, setFollowing] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');

  // 认证相关(仅自己主页使用)
  const [verifyTab, setVerifyTab] = useState<VerifyTab>('email');
  const [verifications, setVerifications] = useState<any[]>([]);
  const [vEmail, setVEmail] = useState('');
  const [vCode, setVCode] = useState('');
  const [vCodeSent, setVCodeSent] = useState(false);
  const [vEmailResult, setVEmailResult] = useState<any>(null);
  const [vLocationResult, setVLocationResult] = useState<any>(null);
  const [vDetecting, setVDetecting] = useState(false);
  const [vManualCity, setVManualCity] = useState('');
  const [vShowManual, setVShowManual] = useState(false);
  const [vOperating, setVOperating] = useState(false);

  useEffect(() => {
    if (!token) { router.push('/login'); return; }
    loadProfile();
  }, [userId, token]);

  useEffect(() => {
    if (!profile) return;
    setError('');
    if (tab === 'posts') loadPosts();
    else if (tab === 'circles') loadCircles();
    else if (tab === 'followers') loadFollowers();
    else if (tab === 'following') loadFollowing();
    else if (tab === 'verify' && isSelf) loadVerifications();
  }, [tab, profile?.id]);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const res: any = await userApi.getUser(userId);
      setProfile(res);
      if (!isSelf && me) {
        try {
          const s: any = await followApi.status(userId);
          setStatus({ isFollowing: s.isFollowing, isFollowedByMe: s.isFollowedByMe });
        } catch {}
      }
    } catch (err: any) {
      setError(err?.message || '加载失败');
    } finally {
      setLoading(false);
    }
  };

  const loadPosts = async () => {
    try { const res: any = await postApi.getByUser(userId); setPosts(res.items || []); } catch { setPosts([]); }
  };

  const loadCircles = async () => {
    if (isSelf) {
      try {
        const [cRes, jRes]: any = await Promise.all([circleApi.myCreated(), circleApi.myJoined()]);
        setCreatedCircles(cRes || []);
        setJoinedCircles(jRes || []);
      } catch {
        setCreatedCircles([]);
        setJoinedCircles([]);
      }
    } else {
      try { const res: any = await userApi.getUserCircles(userId); setPublicCircles(res || []); } catch { setPublicCircles([]); }
    }
  };

  const loadFollowers = async () => {
    try { const res: any = await followApi.followers(userId); setFollowers(res.items || []); } catch { setFollowers([]); }
  };

  const loadFollowing = async () => {
    try { const res: any = await followApi.following(userId); setFollowing(res.items || []); } catch { setFollowing([]); }
  };

  const loadVerifications = async () => {
    try { const res: any = await verificationApi.list(); setVerifications(res || []); } catch { setVerifications([]); }
  };

  const handleFollow = async () => {
    if (!status || actionLoading) return;
    setActionLoading(true);
    setError('');
    try {
      if (status.isFollowing) {
        await followApi.unfollow(userId);
        setStatus({ ...status, isFollowing: false });
        setProfile((p: any) => p && ({ ...p, _count: { ...p._count, followers: Math.max(0, (p._count?.followers ?? 0) - 1) } }));
      } else {
        await followApi.follow(userId);
        setStatus({ ...status, isFollowing: true });
        setProfile((p: any) => p && ({ ...p, _count: { ...p._count, followers: (p._count?.followers ?? 0) + 1 } }));
      }
    } catch (err: any) {
      setError(Array.isArray(err?.message) ? err.message.join('；') : err?.message || '操作失败');
    } finally {
      setActionLoading(false);
    }
  };

  // === 认证方法 ===
  const handleDeleteVerification = async (id: string, label: string) => {
    if (!confirm(`确定要删除「${label}」认证吗？将退出对应的自动加入圈子。`)) return;
    setVOperating(true); setError('');
    try {
      await verificationApi.remove(id);
      setVerifications((prev) => prev.filter((v) => v.id !== id));
      setVEmailResult(null); setVLocationResult(null); setVCodeSent(false);
      loadProfile();
    } catch (err: any) {
      setError(Array.isArray(err?.message) ? err.message.join('；') : err?.message || '删除失败');
    } finally { setVOperating(false); }
  };

  const handleSendCode = async () => {
    if (!vEmail.trim()) return;
    setError(''); setVOperating(true);
    try {
      await verificationApi.sendEmailCode(vEmail.trim());
      setVCodeSent(true);
    } catch (err: any) {
      setError(Array.isArray(err?.message) ? err.message.join('；') : err?.message || '发送失败');
    } finally { setVOperating(false); }
  };

  const handleVerifyEmail = async () => {
    if (!vCode.trim()) return;
    setError(''); setVOperating(true);
    try {
      const res: any = await verificationApi.verifyEmail(vEmail.trim(), vCode.trim());
      setVEmailResult(res);
      loadVerifications();
      loadProfile();
    } catch (err: any) {
      setError(Array.isArray(err?.message) ? err.message.join('；') : err?.message || '验证失败');
    } finally { setVOperating(false); }
  };

  const handleDetectLocation = () => {
    if (!navigator.geolocation) { setError('当前浏览器不支持定位功能'); return; }
    setError(''); setVDetecting(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res: any = await verificationApi.verifyLocationByCoords(pos.coords.latitude, pos.coords.longitude);
          setVLocationResult(res);
          loadVerifications();
          loadProfile();
        } catch (err: any) {
          setError(Array.isArray(err?.message) ? err.message.join('；') : err?.message || '位置识别失败');
        } finally { setVDetecting(false); }
      },
      (err) => {
        setVDetecting(false);
        if (err.code === 1) setError('定位权限被拒绝，请在浏览器设置中允许定位');
        else if (err.code === 2) setError('无法获取位置信息，请稍后重试');
        else setError('定位超时,请稍后重试');
      },
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 },
    );
  };

  const handleManualVerifyLocation = async () => {
    if (!vManualCity.trim()) return;
    setError(''); setVOperating(true);
    try {
      const res: any = await verificationApi.verifyLocation(vManualCity.trim());
      setVLocationResult(res);
      loadVerifications();
      loadProfile();
    } catch (err: any) {
      setError(Array.isArray(err?.message) ? err.message.join('；') : err?.message || '验证失败');
    } finally { setVOperating(false); }
  };

  const resetEmailForm = () => { setVEmail(''); setVCode(''); setVCodeSent(false); setVEmailResult(null); setError(''); };
  const resetLocationForm = () => { setVLocationResult(null); setVManualCity(''); setVShowManual(false); setError(''); };

  const setTab = (t: Tab) => router.replace(`/users/${userId}?tab=${t}`);

  if (loading) return <div className="flex items-center justify-center py-20 text-gray-400">加载中...</div>;
  if (!profile) return <div className="flex items-center justify-center py-20 text-gray-400">{error || '用户不存在'}</div>;

  const verifiedEmail = profile.profile?.verifiedEmail;
  const verifiedCity = profile.profile?.verifiedCity;

  const tabs: { key: Tab; label: string }[] = [
    { key: 'posts', label: '动态' },
    { key: 'circles', label: '圈子' },
    { key: 'followers', label: '粉丝' },
    { key: 'following', label: '关注' },
    ...(isSelf ? [{ key: 'verify' as Tab, label: '认证' }] : []),
  ];

  const emailVerifications = verifications.filter((v) => v.type === 'EMAIL');
  const locationVerifications = verifications.filter((v) => v.type === 'LOCATION');
  const currentCircles = isSelf ? (circleTab === 'created' ? createdCircles : joinedCircles) : publicCircles;

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6">
      {error && <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-xl text-sm border border-red-100">{error}</div>}

      {/* 顶部信息卡 */}
      <div className="bg-white rounded-2xl shadow-sm border p-6 mb-4">
        <div className="flex items-start gap-4">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white text-2xl font-medium shrink-0">
            {profile.nickname?.[0] || '?'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-gray-900">{profile.nickname}</h1>
              {status?.isFollowedByMe && (
                <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-500 rounded">关注了你</span>
              )}
            </div>
            <p className="text-sm text-gray-400 mt-0.5">@{profile.username}</p>
            {(verifiedEmail || verifiedCity) && (
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                {verifiedEmail && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-blue-50 text-blue-600 rounded-full border border-blue-100">
                    ✉ {verifiedEmail}
                  </span>
                )}
                {verifiedCity && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-cyan-50 text-cyan-600 rounded-full border border-cyan-100">
                    📍 {verifiedCity}
                  </span>
                )}
              </div>
            )}
            {profile.bio && <p className="text-gray-600 text-sm mt-3 whitespace-pre-wrap">{profile.bio}</p>}

            <div className="flex items-center gap-6 mt-4 text-sm">
              <button onClick={() => setTab('posts')} className="hover:text-blue-600 transition">
                <span className="font-semibold text-gray-900">{profile._count?.posts ?? 0}</span>
                <span className="text-gray-500 ml-1">动态</span>
              </button>
              <button onClick={() => setTab('circles')} className="hover:text-blue-600 transition">
                <span className="font-semibold text-gray-900">{profile._count?.circleMembers ?? 0}</span>
                <span className="text-gray-500 ml-1">圈子</span>
              </button>
              <button onClick={() => setTab('followers')} className="hover:text-blue-600 transition">
                <span className="font-semibold text-gray-900">{profile._count?.followers ?? 0}</span>
                <span className="text-gray-500 ml-1">粉丝</span>
              </button>
              <button onClick={() => setTab('following')} className="hover:text-blue-600 transition">
                <span className="font-semibold text-gray-900">{profile._count?.following ?? 0}</span>
                <span className="text-gray-500 ml-1">关注</span>
              </button>
            </div>
          </div>

          <div className="shrink-0">
            {isSelf ? (
              <button disabled className="px-4 py-2 text-sm bg-gray-100 text-gray-400 rounded-xl cursor-not-allowed">
                编辑资料
              </button>
            ) : status && (
              <button
                onClick={handleFollow}
                disabled={actionLoading}
                className={`px-5 py-2 text-sm rounded-xl font-medium transition disabled:opacity-50 ${
                  status.isFollowing
                    ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {status.isFollowing ? (status.isFollowedByMe ? '互相关注' : '已关注') : '关注'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-gray-100 rounded-xl p-1">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex-1 py-2 text-sm rounded-lg font-medium transition ${tab === t.key ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* === 动态 === */}
      {tab === 'posts' && (
        <div className="space-y-3">
          {posts.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm border p-10 text-center text-gray-400 text-sm">
              暂无{isSelf ? '动态' : '共同圈子中的动态'}
            </div>
          ) : posts.map((post: any) => (
            <div key={post.id} className="bg-white rounded-2xl shadow-sm border p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-medium shrink-0">
                  {profile.nickname[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900">{profile.nickname}</p>
                  <p className="text-xs text-gray-400">{new Date(post.createdAt).toLocaleString()}</p>
                </div>
                <button onClick={() => router.push(`/circles/${post.circle.id}`)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-full transition shrink-0 ${CIRCLE_TYPE_COLORS[post.circle.type] || 'bg-blue-50 text-blue-600'}`}>
                  {CIRCLE_TYPE_LABELS[post.circle.type]} · {post.circle.name}
                </button>
              </div>
              <p className="text-gray-800 whitespace-pre-wrap leading-relaxed line-clamp-6">
                {renderContentWithTags(post.content, (name) => router.push(`/tags/${encodeURIComponent(name)}`))}
              </p>
              <div className="flex items-center gap-6 pt-3 mt-3 border-t border-gray-100 text-sm text-gray-400">
                <span className={post.isLiked ? 'text-red-500' : ''}>❤ {post.likeCount ?? 0}</span>
                <span>💬 {post._count?.comments ?? 0}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* === 圈子 === */}
      {tab === 'circles' && (
        <div>
          {isSelf && (
            <div className="flex items-center justify-between mb-4">
              <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
                <button onClick={() => setCircleTab('created')}
                  className={`px-4 py-1.5 text-sm rounded-lg font-medium transition ${circleTab === 'created' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
                  我创建的 <span className="ml-1 text-gray-400">{createdCircles.length}</span>
                </button>
                <button onClick={() => setCircleTab('joined')}
                  className={`px-4 py-1.5 text-sm rounded-lg font-medium transition ${circleTab === 'joined' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
                  我加入的 <span className="ml-1 text-gray-400">{joinedCircles.length}</span>
                </button>
              </div>
              <button onClick={() => router.push('/circles/create')}
                className="px-4 py-2 bg-blue-600 text-white text-sm rounded-xl hover:bg-blue-700 transition font-medium">
                创建圈子
              </button>
            </div>
          )}

          {currentCircles.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm border p-10 text-center">
              <p className="text-gray-400 text-sm mb-4">
                {isSelf
                  ? (circleTab === 'created' ? '还没有创建圈子' : '还没有加入圈子')
                  : '暂无公开圈子'}
              </p>
              {isSelf && circleTab === 'created' && (
                <button onClick={() => router.push('/circles/create')}
                  className="px-5 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition font-medium text-sm">
                  去创建
                </button>
              )}
              {isSelf && circleTab === 'joined' && (
                <button onClick={() => router.push('/feed?tab=discover')}
                  className="px-5 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition font-medium text-sm">
                  去发现
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {currentCircles.map((c: any) => (
                <div key={c.id} onClick={() => router.push(`/circles/${c.id}`)}
                  className="bg-white rounded-2xl shadow-sm border p-5 cursor-pointer hover:shadow-md transition">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-gray-900">{c.name}</h3>
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full shrink-0 ${CIRCLE_TYPE_COLORS[c.type] || 'bg-blue-50 text-blue-600'}`}>
                      {CIRCLE_TYPE_LABELS[c.type] || c.type}
                    </span>
                  </div>
                  {c.description && <p className="text-sm text-gray-500 line-clamp-2 mb-2">{c.description}</p>}
                  <div className="flex items-center gap-4 text-xs text-gray-400">
                    <span>{c.memberCount ?? c._count?.members ?? 0} 成员</span>
                    <span>{c._count?.posts ?? 0} 帖子</span>
                    {!c.isPublic && <span className="text-gray-300">私密</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* === 粉丝 / 关注 === */}
      {(tab === 'followers' || tab === 'following') && (
        <div className="space-y-2">
          {(tab === 'followers' ? followers : following).length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm border p-10 text-center text-gray-400 text-sm">
              {tab === 'followers' ? '还没有粉丝' : '还没有关注任何人'}
            </div>
          ) : (tab === 'followers' ? followers : following).map((u: any) => (
            <div key={u.id} onClick={() => router.push(`/users/${u.id}`)}
              className="bg-white rounded-xl shadow-sm border p-4 flex items-center gap-3 cursor-pointer hover:shadow-md transition">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-medium shrink-0">
                {u.nickname?.[0] || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">{u.nickname}</p>
                <p className="text-xs text-gray-400 truncate">@{u.username}{u.bio ? ` · ${u.bio}` : ''}</p>
              </div>
              {me && u.id !== me.id && (
                <span className={`shrink-0 px-2 py-0.5 text-xs rounded ${u.isFollowing ? 'bg-gray-100 text-gray-500' : 'bg-blue-50 text-blue-600'}`}>
                  {u.isFollowing ? '已关注' : '未关注'}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* === 认证(仅自己) === */}
      {tab === 'verify' && isSelf && (
        <div>
          {/* 已认证列表 */}
          {verifyTab === 'email' && emailVerifications.length > 0 && (
            <div className="mb-4 space-y-2">
              {emailVerifications.map((v) => (
                <div key={v.id} className="flex items-center justify-between bg-white rounded-xl border px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="px-2 py-0.5 text-xs font-medium rounded-full border bg-blue-50 text-blue-700 border-blue-200">✉ 邮箱认证</span>
                    <span className="text-sm text-gray-700 font-medium">{v.value}</span>
                  </div>
                  <button onClick={() => handleDeleteVerification(v.id, v.value)} disabled={vOperating}
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          {verifyTab === 'location' && locationVerifications.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center justify-between bg-white rounded-xl border px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="px-2 py-0.5 text-xs font-medium rounded-full border bg-green-50 text-green-700 border-green-200">📍 位置认证</span>
                  <span className="text-sm text-gray-700 font-medium">{locationVerifications[0].value}</span>
                </div>
                <button onClick={() => handleDeleteVerification(locationVerifications[0].id, locationVerifications[0].value)} disabled={vOperating}
                  className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              </div>
            </div>
          )}

          {/* 子 tab 切换 */}
          <div className="flex gap-1 mb-4 bg-gray-100 rounded-xl p-1">
            <button onClick={() => { setVerifyTab('email'); resetEmailForm(); }}
              className={`flex-1 py-2 text-sm rounded-lg font-medium transition ${verifyTab === 'email' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
              邮箱认证
            </button>
            <button onClick={() => { setVerifyTab('location'); resetLocationForm(); }}
              className={`flex-1 py-2 text-sm rounded-lg font-medium transition ${verifyTab === 'location' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
              位置认证
            </button>
          </div>

          {/* 邮箱认证 */}
          {verifyTab === 'email' && (
            <div className="bg-white rounded-2xl shadow-sm border p-6 space-y-5">
              {!vEmailResult ? (
                <>
                  <div>
                    <p className="text-sm text-gray-500 mb-4">使用企业或学校邮箱认证,可自动加入对应的企业圈或校友圈</p>
                    <label className="block text-sm font-medium text-gray-700 mb-1">邮箱地址</label>
                    <input type="email" value={vEmail} onChange={(e) => setVEmail(e.target.value)} placeholder="name@company.com"
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition" />
                  </div>
                  {!vCodeSent ? (
                    <button onClick={handleSendCode} disabled={vOperating || !vEmail.trim()}
                      className="w-full py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition font-medium">
                      {vOperating ? '发送中...' : '获取验证码'}
                    </button>
                  ) : (
                    <>
                      <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-sm text-blue-700">
                        验证码已发送至 <span className="font-medium">{vEmail}</span>,请查收邮箱
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">验证码</label>
                        <input value={vCode} onChange={(e) => setVCode(e.target.value)} placeholder="请输入6位验证码" maxLength={6}
                          className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-center text-lg tracking-widest font-mono focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition" />
                      </div>
                      <button onClick={handleVerifyEmail} disabled={vOperating || vCode.length !== 6}
                        className="w-full py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition font-medium">
                        {vOperating ? '验证中...' : '验证'}
                      </button>
                    </>
                  )}
                </>
              ) : (
                <div className="bg-green-50 border border-green-100 rounded-xl p-5 text-center">
                  <p className="text-green-700 font-medium text-lg mb-2">认证成功</p>
                  {vEmailResult.domain ? (
                    <p className="text-sm text-gray-600 mb-3">检测到{vEmailResult.domain.type === 'SCHOOL' ? '学校' : '企业'}邮箱:{vEmailResult.domain.name}</p>
                  ) : (
                    <p className="text-sm text-gray-500 mb-3">邮箱已验证(未匹配到已知企业或学校)</p>
                  )}
                  {vEmailResult.joinedCircle && (
                    <div className="inline-block px-4 py-2 bg-blue-50 text-blue-700 rounded-xl text-sm font-medium mb-3">
                      已自动加入:{vEmailResult.joinedCircle.name}
                    </div>
                  )}
                  <div>
                    <button onClick={resetEmailForm} className="text-sm text-blue-600 hover:underline">继续认证其他邮箱</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 位置认证 */}
          {verifyTab === 'location' && (
            <div className="bg-white rounded-2xl shadow-sm border p-6 space-y-5">
              {!vLocationResult ? (
                <>
                  <div>
                    <p className="text-sm text-gray-500 mb-2">自动获取设备位置,认证所在城市并加入对应的地域圈</p>
                    <p className="text-xs text-gray-400 mb-4">点击下方按钮后,请在浏览器弹窗中允许定位权限</p>
                  </div>
                  <button onClick={handleDetectLocation} disabled={vDetecting}
                    className="w-full py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition font-medium flex items-center justify-center gap-2">
                    {vDetecting ? (
                      <>
                        <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        正在定位...
                      </>
                    ) : '📍 获取当前位置'}
                  </button>
                  <div className="text-center">
                    <button onClick={() => setVShowManual(!vShowManual)} className="text-xs text-gray-400 hover:text-gray-600 transition">
                      {vShowManual ? '收起手动输入' : '自动定位失败?手动输入城市'}
                    </button>
                  </div>
                  {vShowManual && (
                    <div className="space-y-3 pt-2 border-t border-gray-100">
                      <input value={vManualCity} onChange={(e) => setVManualCity(e.target.value)} placeholder="例如:北京"
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition" />
                      <button onClick={handleManualVerifyLocation} disabled={vOperating || !vManualCity.trim()}
                        className="w-full py-2.5 bg-gray-600 text-white rounded-xl hover:bg-gray-700 disabled:opacity-50 transition font-medium">
                        {vOperating ? '认证中...' : '手动认证'}
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="bg-green-50 border border-green-100 rounded-xl p-5 text-center">
                  <p className="text-green-700 font-medium text-lg mb-2">认证成功</p>
                  <p className="text-sm text-gray-600 mb-3">已认证城市:{vLocationResult.city}</p>
                  {vLocationResult.joinedCircle && (
                    <div className="inline-block px-4 py-2 bg-blue-50 text-blue-700 rounded-xl text-sm font-medium mb-3">
                      已自动加入:{vLocationResult.joinedCircle.name}
                    </div>
                  )}
                  <div>
                    <button onClick={resetLocationForm} className="text-sm text-blue-600 hover:underline">重新认证</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
