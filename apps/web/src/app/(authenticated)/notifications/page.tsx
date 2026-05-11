'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { notificationApi } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import { useNotificationStore } from '@/stores/notification';

const TYPE_LABELS: Record<string, string> = {
  like: '点赞',
  comment: '评论',
  follow: '关注',
  circle_apply: '入圈申请',
  circle_approved: '申请通过',
  circle_rejected: '申请拒绝',
  system: '系统通知',
};

export default function NotificationsPage() {
  const router = useRouter();
  const { token } = useAuthStore();
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const setUnreadCount = useNotificationStore((s) => s.setUnreadCount);
  const decrement = useNotificationStore((s) => s.decrement);
  const clearUnread = useNotificationStore((s) => s.clear);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      router.push('/login');
      return;
    }
    loadNotifications();
  }, [token]);

  const loadNotifications = async () => {
    try {
      const res: any = await notificationApi.list();
      setNotifications(res.items);
      setUnreadCount(res.unreadCount);
    } catch {} finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      await notificationApi.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      decrement(1);
    } catch {}
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationApi.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      clearUnread();
    } catch {}
  };

  const handleClick = (n: any) => {
    // 标记已读(无论是否跳转)
    if (!n.isRead) handleMarkAsRead(n.id);

    // 按类型跳转到对应"现场"
    switch (n.type) {
      case 'circle_apply':
        // 管理员收到的入圈申请 → 去圈子管理页(targetId 是 circleId)
        if (n.targetId) router.push(`/circles/${n.targetId}/manage`);
        break;
      case 'circle_approved':
      case 'circle_rejected':
        // 申请结果 → 去圈子详情
        if (n.targetId) router.push(`/circles/${n.targetId}`);
        break;
      case 'follow':
        // 关注 → 去关注者主页
        if (n.actor?.id) router.push(`/users/${n.actor.id}`);
        break;
      case 'like':
      case 'comment':
        // 点赞帖子/评论 或 评论帖子 → 统一跳到帖子详情页
        // 后端已确保此类通知的 targetId 指向 postId(comment.like 也冗余成 postId)
        if (n.targetId) router.push(`/posts/${n.targetId}`);
        break;
      default:
        break;
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20 text-gray-400">加载中...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">通知 {unreadCount > 0 && <span className="text-sm font-normal text-red-500">({unreadCount} 条未读)</span>}</h1>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllAsRead}
            className="text-sm text-blue-600 hover:underline"
          >
            全部标记已读
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="text-center py-12 text-gray-400">暂无通知</div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n: any) => {
            const isActionable = ['circle_apply', 'circle_approved', 'circle_rejected', 'follow', 'like', 'comment'].includes(n.type);
            return (
              <div
                key={n.id}
                className={`p-4 rounded-lg border transition ${isActionable ? 'cursor-pointer hover:shadow-sm' : ''} ${
                  n.isRead ? 'bg-white' : 'bg-blue-50 border-blue-100'
                }`}
                onClick={() => handleClick(n)}
              >
                <div className="flex items-start gap-3">
                  {n.actor && (
                    <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-xs shrink-0">
                      {n.actor.nickname[0]}
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="text-sm">
                      <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-xs mr-2">
                        {TYPE_LABELS[n.type] || n.type}
                      </span>
                      {n.content}
                    </p>
                    <p className="text-xs text-gray-400 mt-1 flex items-center gap-2">
                      <span>{new Date(n.createdAt).toLocaleString()}</span>
                      {n.type === 'circle_apply' && (
                        <span className="text-blue-500">点击前往审批 →</span>
                      )}
                    </p>
                  </div>
                  {!n.isRead && (
                    <div className="w-2 h-2 bg-red-500 rounded-full mt-2 shrink-0" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
