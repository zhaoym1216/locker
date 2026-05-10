import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginationDto } from '../../common/dto/pagination.dto';

@Injectable()
export class NotificationService {
  constructor(private prisma: PrismaService) {}

  async create(data: {
    userId: string;
    actorId?: string;
    type: string;
    targetType?: number;
    targetId?: string;
    content: string;
  }) {
    return this.prisma.notification.create({ data });
  }

  async findByUser(userId: string, dto: PaginationDto) {
    const where = { userId };
    const [items, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        include: {
          actor: { select: { id: true, username: true, nickname: true, avatarUrl: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: dto.skip,
        take: dto.pageSize,
      }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({ where: { userId, isRead: false } }),
    ]);
    return {
      items,
      total,
      unreadCount,
      page: dto.page,
      pageSize: dto.pageSize,
      totalPages: Math.ceil(total / dto.pageSize),
    };
  }

  async markAsRead(notificationId: string, userId: string) {
    return this.prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { isRead: true },
    });
  }

  async markAllAsRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }
}
