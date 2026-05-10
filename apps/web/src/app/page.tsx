export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="text-center">
        <h1 className="text-5xl font-bold text-blue-600 mb-4">Locker</h1>
        <p className="text-xl text-gray-600 mb-8">
          基于认证圈子的社交平台
        </p>
        <div className="flex gap-4 justify-center">
          <a
            href="/login"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            登录
          </a>
          <a
            href="/register"
            className="px-6 py-3 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition"
          >
            注册
          </a>
        </div>
      </div>
    </main>
  );
}
