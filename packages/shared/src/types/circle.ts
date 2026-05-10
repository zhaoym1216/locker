export enum CircleType {
  INDUSTRY = 'INDUSTRY',
  ALUMNI = 'ALUMNI',
  INTEREST = 'INTEREST',
  REGION = 'REGION',
  COMPANY = 'COMPANY',
  PROJECT = 'PROJECT',
  PAID = 'PAID',
  PRIVATE = 'PRIVATE',
}

export enum AuthMethod {
  EMAIL = 'EMAIL',
  INVITE_CODE = 'INVITE_CODE',
  APPROVAL = 'APPROVAL',
  CERTIFICATE = 'CERTIFICATE',
  PAYMENT = 'PAYMENT',
  LOCATION = 'LOCATION',
  SOCIAL_GRAPH = 'SOCIAL_GRAPH',
}

export enum CircleRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER',
}

export enum MemberStatus {
  PENDING = 0,
  APPROVED = 1,
  REJECTED = 2,
  BANNED = 3,
}

export interface ICircle {
  id: string;
  name: string;
  description?: string;
  avatarUrl?: string;
  coverUrl?: string;
  type: CircleType;
  authMethods: AuthMethod[];
  maxMembers: number;
  memberCount: number;
  tags: string[];
  isPublic: boolean;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
}
