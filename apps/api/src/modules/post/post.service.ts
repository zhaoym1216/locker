import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { CreatePostDto } from './dto/create-post.dto';
import { PaginationDto, PaginatedResult } from '../../common/dto/pagination.dto';

@Injectable()
export class PostService {
  constructor(
    private prisma: PrismaService,
    private notificationService: NotificationService,
  ) {}

  private async checkMembership(circleId: string, userId: string) {
    const member = await this.prisma.circleMember.findUnique({
      where: { circleId_userId: { circleId, userId } },
    });
    if (!member || member.status !== 1) {
      throw new ForbiddenException('你不是该圈子的成员');
    }
    return member;
  }

  async create(userId: string, dto: CreatePostDto) {
    await this.checkMembership(dto.circleId, userId);

    return this.prisma.post.create({
      data: {
        userId,
        circleId: dto.circleId,
        content: dto.content,
        mediaUrls: dto.mediaUrls || [],
        type: dto.type || 'TEXT',
        isAnonymous: dto.isAnonymous || false,
      },
      include: {
        user: { select: { id: true, username: true, nickname: true, avatarUrl: true } },
      },
    });
  }

  async findFeed(dto: PaginationDto, userId: string): Promise<PaginatedResult<any>> {
    // 获取用户加入的所有圈子 ID
    const memberships = await this.prisma.circleMember.findMany({
      where: { userId, status: 1 },
      select: { circleId: true },
    });
    const circleIds = memberships.map(m => m.circleId);
    if (circleIds.length === 0) {
      return { items: [], total: 0, page: dto.page, pageSize: dto.pageSize, totalPages: 0 };
    }

    const where = { circleId: { in: circleIds }, status: 0 };
    const [items, total] = await Promise.all([
      this.prisma.post.findMany({
        where,
        include: {
          user: { select: { id: true, username: true, nickname: true, avatarUrl: true } },
          circle: { select: { id: true, name: true, type: true } },
          _count: { select: { comments: true } },
        },
        orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
        skip: dto.skip,
        take: dto.pageSize,
      }),
      this.prisma.post.count({ where }),
    ]);

    const postIds = items.map(p => p.id);
    const likeCounts = await this.prisma.like.groupBy({
      by: ['targetId'],
      where: { targetType: 1, targetId: { in: postIds } },
      _count: true,
    });
    const likeCountMap = new Map(likeCounts.map(l => [l.targetId, l._count]));

    const userLikes = await this.prisma.like.findMany({
      where: { userId, targetType: 1, targetId: { in: postIds } },
      select: { targetId: true },
    });
    const likedSet = new Set(userLikes.map(l => l.targetId));

    const itemsWithLikeStatus = items.map(post => ({
      ...post,
      likeCount: likeCountMap.get(post.id) ?? post.likeCount,
      isLiked: likedSet.has(post.id),
    }));

    return { items: itemsWithLikeStatus, total, page: dto.page, pageSize: dto.pageSize, totalPages: Math.ceil(total / dto.pageSize) };
  }

  async findByCircle(circleId: string, dto: PaginationDto, userId: string): Promise<PaginatedResult<any>> {
    await this.checkMembership(circleId, userId);

    const where = { circleId, status: 0 };
    const [items, total] = await Promise.all([
      this.prisma.post.findMany({
        where,
        include: {
          user: { select: { id: true, username: true, nickname: true, avatarUrl: true } },
          tags: { include: { tag: true } },
          _count: { select: { comments: true } },
        },
        orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
        skip: dto.skip,
        take: dto.pageSize,
      }),
      this.prisma.post.count({ where }),
    ]);

    const postIds = items.map(p => p.id);

    // 查询每个帖子的点赞数
    const likeCounts = await this.prisma.like.groupBy({
      by: ['targetId'],
      where: { targetType: 1, targetId: { in: postIds } },
      _count: true,
    });
    const likeCountMap = new Map(likeCounts.map(l => [l.targetId, l._count]));

    // 查询当前用户是否点赞了这些帖子
    const userLikes = await this.prisma.like.findMany({
      where: { userId, targetType: 1, targetId: { in: postIds } },
      select: { targetId: true },
    });
    const likedSet = new Set(userLikes.map(l => l.targetId));

    const itemsWithLikeStatus = items.map(post => ({
      ...post,
      likeCount: likeCountMap.get(post.id) ?? post.likeCount,
      isLiked: likedSet.has(post.id),
    }));

    return { items: itemsWithLikeStatus, total, page: dto.page, pageSize: dto.pageSize, totalPages: Math.ceil(total / dto.pageSize) };
  }

  async findByUser(targetUserId: string, dto: PaginationDto, viewerId: string): Promise<PaginatedResult<any>> {
    // 查看者只能看到自己也加入的圈子里,目标用户发的帖子
    const memberships = await this.prisma.circleMember.findMany({
      where: { userId: viewerId, status: 1 },
      select: { circleId: true },
    });
    const circleIds = memberships.map((m) => m.circleId);
    if (circleIds.length === 0) {
      return { items: [], total: 0, page: dto.page, pageSize: dto.pageSize, totalPages: 0 };
    }

    const where = { userId: targetUserId, circleId: { in: circleIds }, status: 0, isAnonymous: false };
    const [items, total] = await Promise.all([
      this.prisma.post.findMany({
        where,
        include: {
          user: { select: { id: true, username: true, nickname: true, avatarUrl: true } },
          circle: { select: { id: true, name: true, type: true } },
          _count: { select: { comments: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: dto.skip,
        take: dto.pageSize,
      }),
      this.prisma.post.count({ where }),
    ]);

    const postIds = items.map((p) => p.id);
    const likeCounts = await this.prisma.like.groupBy({
      by: ['targetId'],
      where: { targetType: 1, targetId: { in: postIds } },
      _count: true,
    });
    const likeCountMap = new Map(likeCounts.map((l) => [l.targetId, l._count]));

    const userLikes = await this.prisma.like.findMany({
      where: { userId: viewerId, targetType: 1, targetId: { in: postIds } },
      select: { targetId: true },
    });
    const likedSet = new Set(userLikes.map((l) => l.targetId));

    const itemsWithLikeStatus = items.map((post) => ({
      ...post,
      likeCount: likeCountMap.get(post.id) ?? post.likeCount,
      isLiked: likedSet.has(post.id),
    }));

    return { items: itemsWithLikeStatus, total, page: dto.page, pageSize: dto.pageSize, totalPages: Math.ceil(total / dto.pageSize) };
  }

  async findOne(id: string, viewerId: string) {
    const post = await this.prisma.post.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, username: true, nickname: true, avatarUrl: true } },
        circle: { select: { id: true, name: true, type: true } },
        tags: { include: { tag: true } },
        _count: { select: { comments: true } },
      },
    });
    if (!post) throw new NotFoundException('动态不存在');
    await this.checkMembership(post.circleId, viewerId);

    const [likeCountRow, myLike] = await Promise.all([
      this.prisma.like.groupBy({
        by: ['targetId'],
        where: { targetType: 1, targetId: id },
        _count: true,
      }),
      this.prisma.like.findUnique({
        where: { userId_targetType_targetId: { userId: viewerId, targetType: 1, targetId: id } },
      }),
    ]);
    const likeCount = likeCountRow[0]?._count ?? post.likeCount;

    return { ...post, likeCount, isLiked: !!myLike };
  }

  async like(userId: string, postId: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      select: { id: true, userId: true, circleId: true },
    });
    if (!post) throw new NotFoundException('动态不存在');
    await this.checkMembership(post.circleId, userId);

    const existing = await this.prisma.like.findUnique({
      where: { userId_targetType_targetId: { userId, targetType: 1, targetId: postId } },
    });

    if (existing) {
      await this.prisma.like.delete({ where: { id: existing.id } });
      await this.prisma.post.update({ where: { id: postId }, data: { likeCount: { decrement: 1 } } });
      return { liked: false };
    }

    await this.prisma.like.create({ data: { userId, targetType: 1, targetId: postId } });
    await this.prisma.post.update({ where: { id: postId }, data: { likeCount: { increment: 1 } } });

    // 通知帖子作者（不通知自己）
    if (post.userId !== userId) {
      const liker = await this.prisma.user.findUnique({ where: { id: userId }, select: { nickname: true } });
      await this.notificationService.create({
        userId: post.userId,
        actorId: userId,
        type: 'like',
        targetType: 1,
        targetId: postId,
        content: `${liker?.nickname || '用户'} 赞了你的动态`,
      });
    }

    return { liked: true };
  }

  async update(userId: string, postId: string, content: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      select: { id: true, userId: true, circleId: true },
    });
    if (!post) throw new NotFoundException('动态不存在');
    const member = await this.checkMembership(post.circleId, userId);
    const isOwner = post.userId === userId;
    const isAdmin = member.role === 'OWNER' || member.role === 'ADMIN';
    if (!isOwner && !isAdmin) throw new ForbiddenException('没有权限编辑此动态');

    return this.prisma.post.update({
      where: { id: postId },
      data: { content },
      include: { user: { select: { id: true, username: true, nickname: true, avatarUrl: true } } },
    });
  }

  async pin(userId: string, postId: string, pinned: boolean) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      select: { id: true, circleId: true },
    });
    if (!post) throw new NotFoundException('动态不存在');
    const member = await this.checkMembership(post.circleId, userId);
    if (member.role !== 'OWNER' && member.role !== 'ADMIN') {
      throw new ForbiddenException('只有管理员可以置顶');
    }

    return this.prisma.post.update({
      where: { id: postId },
      data: { isPinned: pinned },
    });
  }

  async delete(userId: string, postId: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      select: { id: true, userId: true, circleId: true },
    });
    if (!post) throw new NotFoundException('动态不存在');
    const member = await this.checkMembership(post.circleId, userId);
    const isOwner = post.userId === userId;
    const isAdmin = member.role === 'OWNER' || member.role === 'ADMIN';
    if (!isOwner && !isAdmin) throw new ForbiddenException('没有权限删除此动态');

    return this.prisma.post.update({ where: { id: postId }, data: { status: 1 } });
  }
}
