'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { circleApi } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';

const ROLE_LABELS: Record<string, string> = { OWNER: '圈主', ADMIN: '管理员', MEMBER: '成员' };
const STATUS_LABELS: Record<number, { label: string; color: string }> = {
  0: { label: '待审批', color: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
  1: { label: '已通过', color: 'bg-green-50 text-green-700 border-green-200' },
  2: { label: '已拒绝', color: 'bg-red-50 text-red-700 border-red-200' },
  3: { label: '已封禁', color: 'bg-gray-50 text-gray-500 border-gray-200' },
};

export default function CircleManagePage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuthStore();
  const circleId = params.id as string;
  const [circle, setCircle] = useState<any>(null);
  const [pending, setPending] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [operating, setOperating] = useState<string | null>(null);
  const [tab, setTab] = useState<'pending' | 'members'>('pending');
  const [editingRole, setEditingRole] = useState<string | null>(null);
  const [generatingCode, setGeneratingCode] = useState(false);

  useEffect(() => { loadData(); }, [circleId]);

  const loadData = async () => {
    setError('');
    try {
      const [circleRes, pendingRes, membersRes]: any = await Promise.all([
        circleApi.get(circleId),
        circleApi.getPendingMembers(circleId),
        circleApi.allMembers(circleId),
      ]);
      setCircle(circleRes);
      setPending(pendingRes.items);
      setMembers(membersRes.items);
    } catch (err: any) {
      setError(Array.isArray(err?.message) ? err.message.join('；') : err?.message || '加载失败');
    } finally { setLoading(false); }
  };

  const handleApprove = async (userId: string) => {
    setOperating(userId); setError('');
    try { await circleApi.approve(circleId, userId); loadData(); }
    catch (err: any) { setError(Array.isArray(err?.message) ? err.message.join('；') : err?.message || '操作失败'); }
    finally { setOperating(null); }
  };

  const handleReject = async (userId: string) => {
    setOperating(userId); setError('');
    try { await circleApi.reject(circleId, userId); loadData(); }
    catch (err: any) { setError(Array.isArray(err?.message) ? err.message.join('；') : err?.message || '操作失败'); }
    finally { setOperating(null); }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    setOperating(userId); setError('');
    try { await circleApi.updateMemberRole(circleId, userId, newRole); setEditingRole(null); loadData(); }
    catch (err: any) { setError(Array.isArray(err?.message) ? err.message.join('；') : err?.message || '操作失败'); }
    finally { setOperating(null); }
  };

  const handleRemove = async (userId: string, nickname: string) => {
    if (!confirm(`确定要移除成员「${nickname}」吗？`)) return;
    setOperating(userId); setError('');
    try { await circleApi.removeMember(circleId, userId); loadData(); }
    catch (err: any) { setError(Array.isArray(err?.message) ? err.message.join('；') : err?.message || '操作失败'); }
    finally { setOperating(null); }
  };

  const handleGenerateInviteCode = async () => {
    setGeneratingCode(true); setError('');
    try {
      const res: any = await circleApi.generateInviteCode(circleId);
      setCircle((prev: any) => ({ ...prev, inviteCode: res.inviteCode }));
    } catch (err: any) { setError(Array.isArray(err?.message) ? err.message.join('；') : err?.message || '生成失败'); }
    finally { setGeneratingCode(false); }
  };

  if (loading) return <div className="flex items-center justify-center py-20 text-gray-400">加载中...</div>;

  const isOwner = members.find((m: any) => m.userId === user?.id)?.role === 'OWNER';

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => router.push(`/circles/${circleId}`)} className="p-2 -ml-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <h1 className="text-2xl font-bold text-gray-900">圈子管理</h1>
          <span className="text-gray-400">—</span>
          <span className="text-gray-500">{circle?.name}</span>
        </div>

        {error && <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-xl text-sm border border-red-100">{error}</div>}

        {/* 邀请码 */}
        {circle?.authMethods?.includes('INVITE_CODE') && (
          <div className="bg-white rounded-2xl shadow-sm border p-5 mb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">入圈邀请码</p>
                {circle.inviteCode ? (
                  <p className="text-2xl font-mono font-bold tracking-widest text-gray-900">{circle.inviteCode}</p>
                ) : (
                  <p className="text-sm text-gray-400">尚未生成邀请码</p>
                )}
              </div>
              <button onClick={handleGenerateInviteCode} disabled={generatingCode}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition font-medium">
                {generatingCode ? '生成中...' : circle.inviteCode ? '重新生成' : '生成邀请码'}
              </button>
            </div>
          </div>
        )}

        {/* Tab 切换 */}
        <div className="flex gap-1 mb-4 bg-gray-100 rounded-xl p-1">
          <button onClick={() => setTab('pending')} className={`flex-1 py-2 text-sm rounded-lg font-medium transition ${tab === 'pending' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
            待审批 {pending.length > 0 && <span className="ml-1 px-1.5 py-0.5 bg-red-500 text-white text-xs rounded-full">{pending.length}</span>}
          </button>
          <button onClick={() => setTab('members')} className={`flex-1 py-2 text-sm rounded-lg font-medium transition ${tab === 'members' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
            全部成员
          </button>
        </div>

        {/* 待审批 */}
        {tab === 'pending' && (
          <div className="bg-white rounded-2xl shadow-sm border p-5">
            {pending.length === 0 ? (
              <p className="text-gray-400 text-center py-12">暂无待审批申请</p>
            ) : (
              <div className="space-y-3">
                {pending.map((m: any) => (
                  <div key={m.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-medium">{m.user.nickname[0]}</div>
                      <div>
                        <p className="font-medium text-gray-900">{m.user.nickname}</p>
                        <p className="text-xs text-gray-400">@{m.user.username} · {new Date(m.joinedAt).toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleApprove(m.userId)} disabled={operating === m.userId}
                        className="px-4 py-1.5 bg-green-500 text-white text-sm rounded-xl hover:bg-green-600 disabled:opacity-50 transition font-medium">通过</button>
                      <button onClick={() => handleReject(m.userId)} disabled={operating === m.userId}
                        className="px-4 py-1.5 bg-red-500 text-white text-sm rounded-xl hover:bg-red-600 disabled:opacity-50 transition font-medium">拒绝</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 全部成员 */}
        {tab === 'members' && (
          <div className="bg-white rounded-2xl shadow-sm border p-5">
            <div className="space-y-2">
              {members.map((m: any) => (
                <div key={m.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-xl transition group">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-medium">{m.user.nickname[0]}</div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900">{m.user.nickname}</p>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${m.role === 'OWNER' ? 'bg-purple-50 text-purple-700 border-purple-200' : m.role === 'ADMIN' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-gray-50 text-gray-500 border-gray-200'}`}>
                          {ROLE_LABELS[m.role] || m.role}
                        </span>
                        {STATUS_LABELS[m.status] && m.status !== 1 && (
                          <span className={`px-2 py-0.5 rounded-full text-xs border ${STATUS_LABELS[m.status].color}`}>{STATUS_LABELS[m.status].label}</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400">@{m.user.username}</p>
                    </div>
                  </div>

                  {/* 操作按钮（圈主可编辑角色，管理员/圈主可移除） */}
                  {m.role !== 'OWNER' && m.userId !== user?.id && (
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition">
                      {isOwner && editingRole === m.id ? (
                        <div className="flex gap-1">
                          <button onClick={() => handleRoleChange(m.userId, 'ADMIN')} disabled={operating === m.userId}
                            className={`px-3 py-1 text-xs rounded-lg transition ${m.role === 'ADMIN' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 hover:bg-blue-50 text-gray-600'}`}>管理员</button>
                          <button onClick={() => handleRoleChange(m.userId, 'MEMBER')} disabled={operating === m.userId}
                            className={`px-3 py-1 text-xs rounded-lg transition ${m.role === 'MEMBER' ? 'bg-gray-200 text-gray-700' : 'bg-gray-100 hover:bg-gray-50 text-gray-600'}`}>成员</button>
                          <button onClick={() => setEditingRole(null)} className="px-2 py-1 text-xs text-gray-400">取消</button>
                        </div>
                      ) : (
                        <>
                          {isOwner && (
                            <button onClick={() => setEditingRole(m.id)} className="px-3 py-1 text-xs text-blue-500 hover:bg-blue-50 rounded-lg transition">编辑角色</button>
                          )}
                          <button onClick={() => handleRemove(m.userId, m.user.nickname)} disabled={operating === m.userId}
                            className="px-3 py-1 text-xs text-red-500 hover:bg-red-50 rounded-lg transition">移除</button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
    </div>
  );
}
