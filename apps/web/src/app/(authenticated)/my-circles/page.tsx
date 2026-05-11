'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth';

export default function MyCirclesRedirect() {
  const router = useRouter();
  const { user, token, fetchUser } = useAuthStore();

  useEffect(() => {
    if (!token) { router.replace('/login'); return; }
    if (!user) { fetchUser(); return; }
    router.replace(`/users/${user.id}?tab=circles`);
  }, [user, token]);

  return <div className="flex items-center justify-center py-20 text-gray-400">跳转中...</div>;
}
