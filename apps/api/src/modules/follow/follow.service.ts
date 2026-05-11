import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { PaginationDto, PaginatedResult } from '../../common/dto/pagination.dto';

@Injectable()
export class FollowService {
  constructor(
    private prisma: PrismaService,
    private notificationService: NotificationService,
  ) {}

  async follow(followerId: string, targetId: string) {
    if (followerId === targetId) {
      throw new BadRequestException('不能关注自己');
    }

    const target = await this.prisma.user.findUnique({
      where: { id: targetId },
      select: { id: true, nickname: true },
    });
    if (!target) throw new NotFoundException('用户不存在');

    const existing = await this.prisma.follow.findUnique({
      where: { followerId_followingId: { followerId, followingId: targetId } },
    });
    if (existing) {
      return { isFollowing: true, alreadyFollowed: true };
    }

    await this.prisma.follow.create({
      data: { followerId, followingId: targetId, status: 0 },
    });

    const me = await this.prisma.user.findUnique({
      where: { id: followerId },
      select: { nickname: true },
    });
    await this.notificationService.create({
      userId: targetId,
      actorId: followerId,
      type: 'follow',
      content: `${me?.nickname || '用户'} 关注了你`,
    });

    return { isFollowing: true, alreadyFollowed: false };
  }

  async unfollow(followerId: string, targetId: string) {
    await this.prisma.follow.deleteMany({
      where: { followerId, followingId: targetId },
    });
    return { isFollowing: false };
  }

  async getStatus(viewerId: string, targetId: string) {
    if (viewerId === targetId) {
      return { isFollowing: false, isFollowedByMe: false, isSelf: true };
    }
    const [a, b] = await Promise.all([
      this.prisma.follow.findUnique({
        where: { followerId_followingId: { followerId: viewerId, followingId: targetId } },
      }),
      this.prisma.follow.findUnique({
        where: { followerId_followingId: { followerId: targetId, followingId: viewerId } },
      }),
    ]);
    return { isFollowing: !!a, isFollowedByMe: !!b, isSelf: false };
  }

  async getFollowers(userId: string, dto: PaginationDto, viewerId?: string): Promise<PaginatedResult<any>> {
    const where = { followingId: userId };
    const [rows, total] = await Promise.all([
      this.prisma.follow.findMany({
        where,
        include: {
          follower: {
            select: { id: true, username: true, nickname: true, avatarUrl: true, bio: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: dto.skip,
        take: dto.pageSize,
      }),
      this.prisma.follow.count({ where }),
    ]);

    const items = await this.attachMyFollowing(rows.map((r) => r.follower), viewerId);
    return { items, total, page: dto.page, pageSize: dto.pageSize, totalPages: Math.ceil(total / dto.pageSize) };
  }

  async getFollowing(userId: string, dto: PaginationDto, viewerId?: string): Promise<PaginatedResult<any>> {
    const where = { followerId: userId };
    const [rows, total] = await Promise.all([
      this.prisma.follow.findMany({
        where,
        include: {
          following: {
            select: { id: true, username: true, nickname: true, avatarUrl: true, bio: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: dto.skip,
        take: dto.pageSize,
      }),
      this.prisma.follow.count({ where }),
    ]);

    const items = await this.attachMyFollowing(rows.map((r) => r.following), viewerId);
    return { items, total, page: dto.page, pageSize: dto.pageSize, totalPages: Math.ceil(total / dto.pageSize) };
  }

  private async attachMyFollowing(users: any[], viewerId?: string) {
    if (!viewerId || users.length === 0) return users.map((u) => ({ ...u, isFollowing: false }));
    const ids = users.map((u) => u.id);
    const mine = await this.prisma.follow.findMany({
      where: { followerId: viewerId, followingId: { in: ids } },
      select: { followingId: true },
    });
    const set = new Set(mine.map((m) => m.followingId));
    return users.map((u) => ({ ...u, isFollowing: set.has(u.id) }));
  }
}
