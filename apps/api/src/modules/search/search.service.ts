import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginationDto, PaginatedResult } from '../../common/dto/pagination.dto';

@Injectable()
export class SearchService {
  constructor(private prisma: PrismaService) {}

  async searchAll(q: string, userId: string) {
    const [users, circles, posts] = await Promise.all([
      this.searchUsers(q, { page: 1, pageSize: 5, skip: 0 } as PaginationDto),
      this.searchCircles(q, { page: 1, pageSize: 5, skip: 0 } as PaginationDto),
      this.searchPosts(q, userId, { page: 1, pageSize: 5, skip: 0 } as PaginationDto),
    ]);
    return { users: users.items, circles: circles.items, posts: posts.items };
  }

  async searchUsers(q: string, dto: PaginationDto): Promise<PaginatedResult<any>> {
    const where = {
      OR: [
        { nickname: { contains: q, mode: 'insensitive' as const } },
        { username: { contains: q, mode: 'insensitive' as const } },
      ],
    };
    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: { id: true, username: true, nickname: true, avatarUrl: true, bio: true },
        skip: dto.skip,
        take: dto.pageSize,
      }),
      this.prisma.user.count({ where }),
    ]);
    return { items, total, page: dto.page, pageSize: dto.pageSize, totalPages: Math.ceil(total / dto.pageSize) };
  }

  async searchCircles(q: string, dto: PaginationDto): Promise<PaginatedResult<any>> {
    const where = {
      OR: [
        { name: { contains: q, mode: 'insensitive' as const } },
        { description: { contains: q, mode: 'insensitive' as const } },
      ],
    };
    const [items, total] = await Promise.all([
      this.prisma.circle.findMany({
        where,
        select: { id: true, name: true, description: true, type: true, memberCount: true, avatarUrl: true },
        skip: dto.skip,
        take: dto.pageSize,
      }),
      this.prisma.circle.count({ where }),
    ]);
    return { items, total, page: dto.page, pageSize: dto.pageSize, totalPages: Math.ceil(total / dto.pageSize) };
  }

  async searchPosts(q: string, userId: string, dto: PaginationDto): Promise<PaginatedResult<any>> {
    const memberships = await this.prisma.circleMember.findMany({
      where: { userId, status: 1 },
      select: { circleId: true },
    });
    const circleIds = memberships.map(m => m.circleId);
    if (circleIds.length === 0) {
      return { items: [], total: 0, page: dto.page, pageSize: dto.pageSize, totalPages: 0 };
    }

    const where = {
      circleId: { in: circleIds },
      status: 0,
      content: { contains: q, mode: 'insensitive' as const },
    };
    const [items, total] = await Promise.all([
      this.prisma.post.findMany({
        where,
        include: {
          user: { select: { id: true, username: true, nickname: true, avatarUrl: true } },
          circle: { select: { id: true, name: true, type: true } },
          tags: { include: { tag: true } },
          _count: { select: { comments: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: dto.skip,
        take: dto.pageSize,
      }),
      this.prisma.post.count({ where }),
    ]);
    return { items, total, page: dto.page, pageSize: dto.pageSize, totalPages: Math.ceil(total / dto.pageSize) };
  }

  // Tag 相关

  async getHotTags(limit = 20) {
    return this.prisma.tag.findMany({
      where: { postCount: { gt: 0 } },
      orderBy: { postCount: 'desc' },
      take: limit,
    });
  }

  async getTagDetail(name: string) {
    const tag = await this.prisma.tag.findUnique({ where: { name } });
    if (!tag) return null;

    const participantCount = await this.prisma.postTag.findMany({
      where: { tagId: tag.id },
      select: { post: { select: { userId: true } } },
      distinct: ['postId'],
    });
    const uniqueUsers = new Set(participantCount.map(pt => pt.post.userId));

    return { ...tag, participantCount: uniqueUsers.size };
  }

  async getPostsByTag(tagName: string, dto: PaginationDto, userId: string): Promise<PaginatedResult<any>> {
    const tag = await this.prisma.tag.findUnique({ where: { name: tagName } });
    if (!tag) {
      return { items: [], total: 0, page: dto.page, pageSize: dto.pageSize, totalPages: 0 };
    }

    const memberships = await this.prisma.circleMember.findMany({
      where: { userId, status: 1 },
      select: { circleId: true },
    });
    const circleIds = memberships.map(m => m.circleId);

    const where = {
      tags: { some: { tagId: tag.id } },
      circleId: { in: circleIds },
      status: 0,
    };
    const [items, total] = await Promise.all([
      this.prisma.post.findMany({
        where,
        include: {
          user: { select: { id: true, username: true, nickname: true, avatarUrl: true } },
          circle: { select: { id: true, name: true, type: true } },
          tags: { include: { tag: true } },
          _count: { select: { comments: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: dto.skip,
        take: dto.pageSize,
      }),
      this.prisma.post.count({ where }),
    ]);
    return { items, total, page: dto.page, pageSize: dto.pageSize, totalPages: Math.ceil(total / dto.pageSize) };
  }
}
