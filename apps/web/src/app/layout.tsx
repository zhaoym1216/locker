import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Enclave - 认证圈子社交平台',
  description: '基于认证圈子的社交平台，发现志同道合的人',
  icons: {
    icon: '/enclave_icon.svg',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-gray-50">
        {children}
      </body>
    </html>
  );
}
