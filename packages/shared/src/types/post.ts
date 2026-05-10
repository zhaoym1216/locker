export enum PostVisibility {
  PUBLIC = 0,
  CIRCLE = 1,
  PRIVATE = 2,
}

export enum PostStatus {
  ACTIVE = 0,
  DELETED = 1,
  PENDING_REVIEW = 2,
}

export enum PostType {
  TEXT = 'TEXT',
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO',
  LINK = 'LINK',
  POLL = 'POLL',
  ANONYMOUS = 'ANONYMOUS',
}

export enum LikeTargetType {
  POST = 1,
  COMMENT = 2,
}

export interface IPost {
  id: string;
  userId: string;
  circleId: string;
  content: string;
  mediaUrls: string[];
  type: PostType;
  visibility: PostVisibility;
  status: PostStatus;
  likeCount: number;
  commentCount: number;
  repostCount: number;
  isAnonymous: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IComment {
  id: string;
  postId: string;
  userId: string;
  parentId?: string;
  replyToId?: string;
  content: string;
  likeCount: number;
  status: PostStatus;
  createdAt: Date;
}
