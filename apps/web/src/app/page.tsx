export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="text-center">
        <img src="/enclave_logo.svg" alt="Enclave" className="h-56 w-auto mx-auto mb-6" />
        <p className="text-xl text-gray-600 mb-8">
          基于认证圈子的社交平台
        </p>
        <div className="flex gap-4 justify-center">
          <a
            href="/login"
            className="px-6 py-3 bg-[#3C3489] text-white rounded-lg hover:bg-[#2d276a] transition"
          >
            登录
          </a>
          <a
            href="/register"
            className="px-6 py-3 border border-[#3C3489] text-[#3C3489] rounded-lg hover:bg-[#3C3489]/5 transition"
          >
            注册
          </a>
        </div>
      </div>
    </main>
  );
}
