export enum UserStatus {
  ACTIVE = 0,
  DISABLED = 1,
  DELETED = 2,
}

export enum PrivacyLevel {
  PUBLIC = 0,
  FRIENDS = 1,
  PRIVATE = 2,
}

export interface IUser {
  id: string;
  username: string;
  nickname: string;
  email?: string;
  phone?: string;
  avatarUrl?: string;
  bio?: string;
  status: UserStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface IUserSetting {
  userId: string;
  privacyLevel: PrivacyLevel;
  allowSearch: boolean;
  notifyConfig: Record<string, boolean>;
}
