'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { notificationApi } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';

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
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
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
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {}
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationApi.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {}
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
          {notifications.map((n: any) => (
            <div
              key={n.id}
              className={`p-4 rounded-lg border cursor-pointer transition ${
                n.isRead ? 'bg-white' : 'bg-blue-50 border-blue-100'
              }`}
              onClick={() => {
                if (!n.isRead) handleMarkAsRead(n.id);
              }}
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
                  <p className="text-xs text-gray-400 mt-1">{new Date(n.createdAt).toLocaleString()}</p>
                </div>
                {!n.isRead && (
                  <div className="w-2 h-2 bg-red-500 rounded-full mt-2 shrink-0" />
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
