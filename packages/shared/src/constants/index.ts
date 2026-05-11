export const APP_NAME = 'Enclave';
export const APP_VERSION = '0.1.0';

export const API_PREFIX = '/api';
export const API_VERSION = 'v1';

export const PAGINATION_DEFAULTS = {
  page: 1,
  pageSize: 20,
  maxPageSize: 100,
} as const;

export const CACHE_KEYS = {
  user: (id: string) => `user:${id}`,
  circle: (id: string) => `circle:${id}`,
  feed: (userId: string) => `feed:${userId}`,
  timeline: (circleId: string) => `timeline:${circleId}`,
} as const;

export const CACHE_TTL = {
  short: 60,        // 1 min
  medium: 300,      // 5 min
  long: 3600,       // 1 hour
  day: 86400,       // 24 hours
} as const;
