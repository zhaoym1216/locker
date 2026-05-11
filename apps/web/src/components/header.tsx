'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/stores/auth';
import { useNotificationStore } from '@/stores/notification';
import { useEffect } from 'react';

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, logout } = useAuthStore();
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const refreshUnread = useNotificationStore((s) => s.refresh);

  const currentTab = searchParams.get('tab') || 'content';
  const isFeed = pathname === '/feed';

  useEffect(() => {
    if (!user) return;
    refreshUnread();
    // 轻量轮询:30s 拉一次未读数,捕捉其他端产生的通知
    const timer = setInterval(refreshUnread, 30000);
    // 回到前台时立即刷新
    const onVisible = () => { if (!document.hidden) refreshUnread(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', onVisible); };
  }, [user]);

  const handleTabClick = (tab: string) => {
    if (isFeed) {
      router.replace(`/feed?tab=${tab}`);
    } else {
      router.push(`/feed?tab=${tab}`);
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200">
      <div className="px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <button onClick={() => router.push('/feed')} className="flex items-center">
          <img src="/enclave_logo.svg" alt="Enclave" className="h-10 w-auto" />
        </button>

        {/* 导航 */}
        <nav className="flex items-center gap-1">
          <button onClick={() => handleTabClick('content')}
            className={`px-4 py-1.5 text-sm rounded-lg transition ${isFeed && currentTab === 'content' ? 'bg-gray-900 text-white' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'}`}>
            内容
          </button>
          <button onClick={() => handleTabClick('discover')}
            className={`px-4 py-1.5 text-sm rounded-lg transition ${isFeed && currentTab === 'discover' ? 'bg-gray-900 text-white' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'}`}>
            发现
          </button>
        </nav>

        {/* 右侧 */}
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/notifications')}
            className="relative p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
            </svg>
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-medium rounded-full flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
          <div onClick={() => user && router.push(`/users/${user.id}`)}
            className="flex items-center gap-2 cursor-pointer group">
            <div className="w-7 h-7 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white text-xs font-medium group-hover:ring-2 group-hover:ring-blue-200 transition">
              {user?.nickname?.[0] || '?'}
            </div>
            <span className="text-sm text-gray-700 hidden sm:block group-hover:text-blue-600 transition">{user?.nickname}</span>
          </div>
          <button onClick={() => { logout(); router.push('/login'); }}
            className="p-2 text-gray-400 hover:text-red-500 transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}
