'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { verificationApi } from '@/lib/api';

const TYPE_LABELS: Record<string, { label: string; color: string; icon: string }> = {
  EMAIL: { label: '邮箱认证', color: 'bg-blue-50 text-blue-700 border-blue-200', icon: '✉' },
  LOCATION: { label: '位置认证', color: 'bg-green-50 text-green-700 border-green-200', icon: '📍' },
};

type Tab = 'email' | 'location';

export default function VerifyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab: Tab = (searchParams.get('tab') as Tab) || 'email';

  const [verifications, setVerifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // 邮箱认证状态
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [emailResult, setEmailResult] = useState<any>(null);

  // 位置认证状态
  const [locationResult, setLocationResult] = useState<any>(null);
  const [detecting, setDetecting] = useState(false);
  const [detectedCity, setDetectedCity] = useState('');
  const [manualCity, setManualCity] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);

  const [operating, setOperating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { loadVerifications(); }, []);

  const loadVerifications = async () => {
    try {
      const res: any = await verificationApi.list();
      setVerifications(res);
    } catch {} finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, label: string) => {
    if (!confirm(`确定要删除「${label}」认证吗？将退出对应的自动加入圈子。`)) return;
    setOperating(true); setError('');
    try {
      await verificationApi.remove(id);
      setVerifications((prev) => prev.filter((v) => v.id !== id));
      setEmailResult(null);
      setLocationResult(null);
      setCodeSent(false);
      setDetectedCity('');
    } catch (err: any) {
      setError(Array.isArray(err?.message) ? err.message.join('；') : err?.message || '删除失败');
    } finally {
      setOperating(false);
    }
  };

  const handleSendCode = async () => {
    if (!email.trim()) return;
    setError('');
    setOperating(true);
    try {
      await verificationApi.sendEmailCode(email.trim());
      setCodeSent(true);
    } catch (err: any) {
      setError(Array.isArray(err?.message) ? err.message.join('；') : err?.message || '发送失败');
    } finally {
      setOperating(false);
    }
  };

  const handleVerifyEmail = async () => {
    if (!code.trim()) return;
    setError('');
    setOperating(true);
    try {
      const res: any = await verificationApi.verifyEmail(email.trim(), code.trim());
      setEmailResult(res);
      loadVerifications();
    } catch (err: any) {
      setError(Array.isArray(err?.message) ? err.message.join('；') : err?.message || '验证失败');
    } finally {
      setOperating(false);
    }
  };

  const handleDetectLocation = async () => {
    if (!navigator.geolocation) {
      setError('当前浏览器不支持定位功能');
      return;
    }
    setError('');
    setDetecting(true);
    setDetectedCity('');
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          // 发送坐标到后端，由后端做逆地理编码
          const res: any = await verificationApi.verifyLocationByCoords(latitude, longitude);
          setLocationResult(res);
          setDetectedCity(res.city);
          loadVerifications();
        } catch (err: any) {
          setError(Array.isArray(err?.message) ? err.message.join('；') : err?.message || '位置识别失败');
        } finally {
          setDetecting(false);
        }
      },
      (err) => {
        setDetecting(false);
        if (err.code === 1) {
          setError('定位权限被拒绝，请在浏览器设置中允许定位');
        } else if (err.code === 2) {
          setError('无法获取位置信息，请稍后重试');
        } else {
          setError('定位超时，请稍后重试');
        }
      },
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 },
    );
  };

  const resetEmailForm = () => {
    setEmail(''); setCode(''); setCodeSent(false); setEmailResult(null); setError('');
  };

  const resetLocationForm = () => {
    setLocationResult(null); setDetectedCity(''); setManualCity(''); setShowManualInput(false); setError('');
  };

  const handleManualVerifyLocation = async () => {
    if (!manualCity.trim()) return;
    setError('');
    setOperating(true);
    try {
      const res: any = await verificationApi.verifyLocation(manualCity.trim());
      setLocationResult(res);
      setDetectedCity(res.city);
      loadVerifications();
    } catch (err: any) {
      setError(Array.isArray(err?.message) ? err.message.join('；') : err?.message || '验证失败');
    } finally {
      setOperating(false);
    }
  };

  const locationVerifications = verifications.filter((v) => v.type === 'LOCATION');
  const emailVerifications = verifications.filter((v) => v.type === 'EMAIL');

  return (
    <div className="max-w-xl mx-auto p-4 sm:p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">身份认证</h1>

      {/* 邮箱认证列表 */}
      {tab === 'email' && emailVerifications.length > 0 && (
        <div className="mb-6 space-y-2">
          {emailVerifications.map((v) => (
            <div key={v.id} className="flex items-center justify-between bg-white rounded-xl border px-4 py-3">
              <div className="flex items-center gap-3">
                <span className="text-lg">✉</span>
                <span className={`px-2 py-0.5 text-xs font-medium rounded-full border bg-blue-50 text-blue-700 border-blue-200`}>邮箱认证</span>
                <span className="ml-2 text-sm text-gray-700 font-medium">{v.value}</span>
              </div>
              <button onClick={() => handleDelete(v.id, v.value)} disabled={operating}
                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 位置认证标签 */}
      {tab === 'location' && locationVerifications.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between bg-white rounded-xl border px-4 py-3">
            <div className="flex items-center gap-3">
              <span className="text-lg">📍</span>
              <span className={`px-2 py-0.5 text-xs font-medium rounded-full border bg-green-50 text-green-700 border-green-200`}>位置认证</span>
              <span className="ml-2 text-sm text-gray-700 font-medium">{locationVerifications[0].value}</span>
            </div>
            <button onClick={() => handleDelete(locationVerifications[0].id, locationVerifications[0].value)} disabled={operating}
              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Tab 切换 */}
      <div className="flex gap-1 mb-6 bg-gray-100 rounded-xl p-1">
        <button onClick={() => { router.replace('/verify?tab=email'); resetEmailForm(); }}
          className={`flex-1 py-2.5 text-sm rounded-lg font-medium transition ${tab === 'email' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
          邮箱认证
        </button>
        <button onClick={() => { router.replace('/verify?tab=location'); resetLocationForm(); }}
          className={`flex-1 py-2.5 text-sm rounded-lg font-medium transition ${tab === 'location' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
          位置认证
        </button>
      </div>

      {error && <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-xl text-sm border border-red-100">{error}</div>}

      {/* 邮箱认证 */}
      {tab === 'email' && (
        <div className="bg-white rounded-2xl shadow-sm border p-6 space-y-5">
          {!emailResult ? (
            <>
              <div>
                <p className="text-sm text-gray-500 mb-4">
                  使用企业或学校邮箱认证，可自动加入对应的企业圈或校友圈
                </p>
                <label className="block text-sm font-medium text-gray-700 mb-1">邮箱地址</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                />
              </div>

              {!codeSent ? (
                <button onClick={handleSendCode} disabled={operating || !email.trim()}
                  className="w-full py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition font-medium">
                  {operating ? '发送中...' : '获取验证码'}
                </button>
              ) : (
                <>
                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-sm text-blue-700">
                    验证码已发送至 <span className="font-medium">{email}</span>，请查收邮箱
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">验证码</label>
                    <input
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      placeholder="请输入6位验证码"
                      maxLength={6}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-center text-lg tracking-widest font-mono focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                    />
                  </div>
                  <button onClick={handleVerifyEmail} disabled={operating || code.length !== 6}
                    className="w-full py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition font-medium">
                    {operating ? '验证中...' : '验证'}
                  </button>
                </>
              )}
            </>
          ) : (
            <div className="bg-green-50 border border-green-100 rounded-xl p-5 text-center">
              <p className="text-green-700 font-medium text-lg mb-2">认证成功</p>
              {emailResult.domain ? (
                <p className="text-sm text-gray-600 mb-3">
                  检测到{emailResult.domain.type === 'SCHOOL' ? '学校' : '企业'}邮箱：{emailResult.domain.name}
                </p>
              ) : (
                <p className="text-sm text-gray-500 mb-3">邮箱已验证（未匹配到已知企业或学校）</p>
              )}
              {emailResult.joinedCircle && (
                <div className="inline-block px-4 py-2 bg-blue-50 text-blue-700 rounded-xl text-sm font-medium mb-3">
                  已自动加入：{emailResult.joinedCircle.name}
                </div>
              )}
              <div>
                <button onClick={resetEmailForm}
                  className="text-sm text-blue-600 hover:underline">继续认证其他邮箱</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 位置认证 */}
      {tab === 'location' && (
        <div className="bg-white rounded-2xl shadow-sm border p-6 space-y-5">
          {!locationResult ? (
            <>
              <div>
                <p className="text-sm text-gray-500 mb-2">
                  自动获取设备位置，认证所在城市并加入对应的地域圈
                </p>
                <p className="text-xs text-gray-400 mb-4">
                  点击下方按钮后，请在浏览器弹窗中允许定位权限
                </p>
              </div>

              <button onClick={handleDetectLocation} disabled={detecting}
                className="w-full py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition font-medium flex items-center justify-center gap-2">
                {detecting ? (
                  <>
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    正在定位...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    获取当前位置
                  </>
                )}
              </button>

              {/* 手动输入 fallback */}
              <div className="text-center">
                <button onClick={() => setShowManualInput(!showManualInput)}
                  className="text-xs text-gray-400 hover:text-gray-600 transition">
                  {showManualInput ? '收起手动输入' : '自动定位失败？手动输入城市'}
                </button>
              </div>

              {showManualInput && (
                <div className="space-y-3 pt-2 border-t border-gray-100">
                  <input
                    value={manualCity}
                    onChange={(e) => setManualCity(e.target.value)}
                    placeholder="例如：北京"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                  />
                  <button onClick={handleManualVerifyLocation} disabled={operating || !manualCity.trim()}
                    className="w-full py-2.5 bg-gray-600 text-white rounded-xl hover:bg-gray-700 disabled:opacity-50 transition font-medium">
                    {operating ? '认证中...' : '手动认证'}
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="bg-green-50 border border-green-100 rounded-xl p-5 text-center">
              <p className="text-green-700 font-medium text-lg mb-2">认证成功</p>
              <p className="text-sm text-gray-600 mb-3">已认证城市：{locationResult.city}</p>
              {locationResult.joinedCircle && (
                <div className="inline-block px-4 py-2 bg-blue-50 text-blue-700 rounded-xl text-sm font-medium mb-3">
                  已自动加入：{locationResult.joinedCircle.name}
                </div>
              )}
              <div>
                <button onClick={resetLocationForm}
                  className="text-sm text-blue-600 hover:underline">重新认证</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
