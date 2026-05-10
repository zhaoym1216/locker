'use client';

import Header from '@/components/header';

export default function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
      <Header />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
