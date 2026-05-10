import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器 - 注入 token
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// 响应拦截器 - 统一错误处理
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error.response?.data || error);
  },
);

export default api;

// Auth API
export const authApi = {
  register: (data: { username: string; password: string; nickname?: string; email?: string }) =>
    api.post('/auth/register', data),
  login: (data: { account: string; password: string }) =>
    api.post('/auth/login', data),
};

// User API
export const userApi = {
  getMe: () => api.get('/users/me'),
  getUser: (id: string) => api.get(`/users/${id}`),
  updateMe: (data: any) => api.patch('/users/me', data),
  search: (q: string, page?: number) => api.get('/users/search', { params: { q, page } }),
};

// Circle API
export const circleApi = {
  list: (page?: number) => api.get('/circles', { params: { page } }),
  listWithStatus: (page?: number) => api.get('/circles/my', { params: { page } }),
  myCreated: () => api.get('/circles/created'),
  myJoined: () => api.get('/circles/joined'),
  get: (id: string) => api.get(`/circles/${id}`),
  create: (data: any) => api.post('/circles', data),
  update: (id: string, data: any) => api.patch(`/circles/${id}`, data),
  join: (id: string, inviteCode?: string) => api.post(`/circles/${id}/join`, { inviteCode }),
  generateInviteCode: (id: string) => api.post(`/circles/${id}/invite-code`),
  leave: (id: string) => api.post(`/circles/${id}/leave`),
  getMyStatus: (id: string) => api.get(`/circles/${id}/my-status`),
  getPendingMembers: (id: string, page?: number) => api.get(`/circles/${id}/pending`, { params: { page } }),
  approve: (circleId: string, userId: string) => api.post(`/circles/${circleId}/approve/${userId}`),
  reject: (circleId: string, userId: string) => api.post(`/circles/${circleId}/reject/${userId}`),
  members: (id: string, page?: number) => api.get(`/circles/${id}/members`, { params: { page } }),
  allMembers: (id: string, page?: number) => api.get(`/circles/${id}/all-members`, { params: { page } }),
  updateMemberRole: (circleId: string, userId: string, role: string) => api.patch(`/circles/${circleId}/members/${userId}/role`, { role }),
  removeMember: (circleId: string, userId: string) => api.delete(`/circles/${circleId}/members/${userId}`),
};

// Post API
export const postApi = {
  create: (data: { circleId: string; content: string; mediaUrls?: string[]; type?: string }) =>
    api.post('/posts', data),
  getFeed: (page?: number) => api.get('/posts/feed', { params: { page } }),
  getByCircle: (circleId: string, page?: number) =>
    api.get(`/posts/circle/${circleId}`, { params: { page } }),
  get: (id: string) => api.get(`/posts/${id}`),
  like: (id: string) => api.post(`/posts/${id}/like`),
  update: (id: string, content: string) => api.patch(`/posts/${id}`, { content }),
  pin: (id: string, pinned: boolean) => api.post(`/posts/${id}/pin`, { pinned }),
  delete: (id: string) => api.delete(`/posts/${id}`),
};

// Comment API
export const commentApi = {
  create: (data: { postId: string; content: string; parentId?: string; replyToId?: string }) =>
    api.post('/comments', data),
  getByPost: (postId: string, page?: number) =>
    api.get(`/comments/post/${postId}`, { params: { page } }),
  getReplies: (commentId: string, page?: number) =>
    api.get(`/comments/${commentId}/replies`, { params: { page } }),
  update: (id: string, content: string) => api.patch(`/comments/${id}`, { content }),
  delete: (id: string) => api.delete(`/comments/${id}`),
  like: (id: string) => api.post(`/comments/${id}/like`),
};

// Notification API
export const notificationApi = {
  list: (page?: number) => api.get('/notifications', { params: { page } }),
  markAsRead: (id: string) => api.patch(`/notifications/${id}/read`),
  markAllAsRead: () => api.patch('/notifications/read-all'),
};

// Verification API
export const verificationApi = {
  list: () => api.get('/verification'),
  remove: (id: string) => api.delete(`/verification/${id}`),
  sendEmailCode: (email: string) => api.post('/verification/email/send', { email }),
  verifyEmail: (email: string, code: string) => api.post('/verification/email/verify', { email, code }),
  verifyLocation: (city: string) => api.post('/verification/location', { city }),
  verifyLocationByCoords: (lat: number, lng: number) => api.post('/verification/location', { lat, lng }, { timeout: 30000 }),
};
