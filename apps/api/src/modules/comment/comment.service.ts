import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { PaginationDto, PaginatedResult } from '../../common/dto/pagination.dto';

@Injectable()
export class CommentService {
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

  private async checkCommentPermission(commentId: string, userId: string) {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
      select: { id: true, userId: true, post: { select: { circleId: true } } },
    });
    if (!comment) throw new NotFoundException('评论不存在');
    const member = await this.prisma.circleMember.findUnique({
      where: { circleId_userId: { circleId: comment.post.circleId, userId } },
    });
    const isOwner = comment.userId === userId;
    const isAdmin = member && (member.role === 'OWNER' || member.role === 'ADMIN');
    if (!isOwner && !isAdmin) {
      throw new ForbiddenException('没有权限执行此操作');
    }
    return comment;
  }

  async findOne(id: string) {
    const comment = await this.prisma.comment.findUnique({
      where: { id },
      select: { id: true, postId: true, userId: true, content: true, createdAt: true, parentId: true, replyToId: true, status: true },
    });
    if (!comment) throw new NotFoundException('评论不存在');
    return comment;
  }

  async create(userId: string, dto: CreateCommentDto) {
    const post = await this.prisma.post.findUnique({
      where: { id: dto.postId },
      select: { id: true, userId: true, circleId: true },
    });
    if (!post) throw new NotFoundException('动态不存在');
    await this.checkMembership(post.circleId, userId);

    const comment = await this.prisma.comment.create({
      data: {
        postId: dto.postId,
        userId,
        content: dto.content,
        parentId: dto.parentId,
        replyToId: dto.replyToId,
      },
      include: {
        user: { select: { id: true, username: true, nickname: true, avatarUrl: true } },
      },
    });

    await this.prisma.post.update({
      where: { id: dto.postId },
      data: { commentCount: { increment: 1 } },
    });

    if (post.userId !== userId) {
      const commenter = await this.prisma.user.findUnique({ where: { id: userId }, select: { nickname: true } });
      await this.notificationService.create({
        userId: post.userId,
        actorId: userId,
        type: 'comment',
        targetType: 1,
        targetId: dto.postId,
        content: `${commenter?.nickname || '用户'} 评论了你的动态`,
      });
    }

    return comment;
  }

  async findByPost(postId: string, dto: PaginationDto, userId?: string): Promise<PaginatedResult<any>> {
    const where = { postId, parentId: null, status: 0 };
    const [items, total] = await Promise.all([
      this.prisma.comment.findMany({
        where,
        select: {
          id: true,
          postId: true,
          userId: true,
          parentId: true,
          replyToId: true,
          content: true,
          likeCount: true,
          status: true,
          createdAt: true,
          user: { select: { id: true, username: true, nickname: true, avatarUrl: true } },
          replies: {
            where: { status: 0 },
            select: {
              id: true,
              postId: true,
              userId: true,
              parentId: true,
              replyToId: true,
              content: true,
              likeCount: true,
              status: true,
              createdAt: true,
              user: { select: { id: true, username: true, nickname: true, avatarUrl: true } },
              replyTo: { select: { id: true, user: { select: { nickname: true } } } },
            },
            take: 3,
            orderBy: { createdAt: 'asc' },
          },
          _count: { select: { replies: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: dto.skip,
        take: dto.pageSize,
      }),
      this.prisma.comment.count({ where }),
    ]);

    // 按点赞数排序（降序）
    const commentIds = items.map(c => c.id);
    const allIds = [...commentIds, ...items.flatMap(c => c.replies.map((r: any) => r.id))];
    const likeCounts = await this.prisma.like.groupBy({
      by: ['targetId'],
      where: { targetType: 2, targetId: { in: allIds } },
      _count: true,
    });
    const likeCountMap = new Map(likeCounts.map(l => [l.targetId, l._count]));

    let userLikedSet = new Set<string>();
    if (userId) {
      const userLikes = await this.prisma.like.findMany({
        where: { userId, targetType: 2, targetId: { in: allIds } },
        select: { targetId: true },
      });
      userLikedSet = new Set(userLikes.map(l => l.targetId));
    }

    const enrichComment = (c: any) => ({
      ...c,
      likeCount: likeCountMap.get(c.id) ?? c.likeCount,
      isLiked: userLikedSet.has(c.id),
      replies: c.replies?.map((r: any) => ({
        ...r,
        likeCount: likeCountMap.get(r.id) ?? r.likeCount,
        isLiked: userLikedSet.has(r.id),
      })),
    });

    const enriched = items.map(enrichComment);
    enriched.sort((a, b) => b.likeCount - a.likeCount);

    return { items: enriched, total, page: dto.page, pageSize: dto.pageSize, totalPages: Math.ceil(total / dto.pageSize) };
  }

  async getReplies(commentId: string, dto: PaginationDto, userId?: string): Promise<PaginatedResult<any>> {
    const parent = await this.prisma.comment.findUnique({
      where: { id: commentId },
      select: { id: true },
    });
    if (!parent) throw new NotFoundException('评论不存在');

    const where = { parentId: commentId, status: 0 };
    const [items, total] = await Promise.all([
      this.prisma.comment.findMany({
        where,
        include: {
          user: { select: { id: true, username: true, nickname: true, avatarUrl: true } },
          replyTo: { select: { id: true, user: { select: { nickname: true } } } },
        },
        orderBy: { createdAt: 'asc' },
        skip: dto.skip,
        take: dto.pageSize,
      }),
      this.prisma.comment.count({ where }),
    ]);

    const replyIds = items.map(c => c.id);
    const likeCounts = await this.prisma.like.groupBy({
      by: ['targetId'],
      where: { targetType: 2, targetId: { in: replyIds } },
      _count: true,
    });
    const likeCountMap = new Map(likeCounts.map(l => [l.targetId, l._count]));

    let userLikedSet = new Set<string>();
    if (userId) {
      const userLikes = await this.prisma.like.findMany({
        where: { userId, targetType: 2, targetId: { in: replyIds } },
        select: { targetId: true },
      });
      userLikedSet = new Set(userLikes.map(l => l.targetId));
    }

    const enriched = items.map((c: any) => ({
      ...c,
      likeCount: likeCountMap.get(c.id) ?? c.likeCount,
      isLiked: userLikedSet.has(c.id),
    }));

    return { items: enriched, total, page: dto.page, pageSize: dto.pageSize, totalPages: Math.ceil(total / dto.pageSize) };
  }

  async update(commentId: string, userId: string, content: string) {
    await this.checkCommentPermission(commentId, userId);
    return this.prisma.comment.update({
      where: { id: commentId },
      data: { content },
      include: { user: { select: { id: true, username: true, nickname: true, avatarUrl: true } } },
    });
  }

  async delete(commentId: string, userId: string) {
    await this.checkCommentPermission(commentId, userId);
    const comment = await this.prisma.comment.update({
      where: { id: commentId },
      data: { status: 1 },
    });
    await this.prisma.post.update({
      where: { id: comment.postId },
      data: { commentCount: { decrement: 1 } },
    });
    return { deleted: true };
  }

  async like(userId: string, commentId: string) {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
      select: { id: true, userId: true, postId: true, post: { select: { circleId: true } } },
    });
    if (!comment) throw new NotFoundException('评论不存在');
    await this.checkMembership(comment.post.circleId, userId);

    const existing = await this.prisma.like.findUnique({
      where: { userId_targetType_targetId: { userId, targetType: 2, targetId: commentId } },
    });

    if (existing) {
      await this.prisma.like.delete({ where: { id: existing.id } });
      await this.prisma.comment.update({ where: { id: commentId }, data: { likeCount: { decrement: 1 } } });
      return { liked: false };
    }

    await this.prisma.like.create({ data: { userId, targetType: 2, targetId: commentId } });
    await this.prisma.comment.update({ where: { id: commentId }, data: { likeCount: { increment: 1 } } });

    if (comment.userId !== userId) {
      const liker = await this.prisma.user.findUnique({ where: { id: userId }, select: { nickname: true } });
      // 通知指向所在帖子,便于前端跳转到帖子详情页
      await this.notificationService.create({
        userId: comment.userId,
        actorId: userId,
        type: 'like',
        targetType: 1,
        targetId: comment.postId,
        content: `${liker?.nickname || '用户'} 赞了你的评论`,
      });
    }

    return { liked: true };
  }
}
