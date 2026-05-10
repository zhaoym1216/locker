import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        nickname: true,
        avatarUrl: true,
        bio: true,
        createdAt: true,
        profile: true,
        _count: {
          select: {
            followers: true,
            following: true,
            posts: true,
            circleMembers: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    return user;
  }

  async updateProfile(userId: string, dto: UpdateUserDto) {
    const { profile, ...userData } = dto;

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        ...userData,
        profile: profile ? { upsert: { create: profile, update: profile } } : undefined,
      },
      select: {
        id: true,
        username: true,
        nickname: true,
        avatarUrl: true,
        bio: true,
        profile: true,
      },
    });
  }

  async search(keyword: string, page = 1, pageSize = 20) {
    const where = {
      OR: [
        { username: { contains: keyword, mode: 'insensitive' as const } },
        { nickname: { contains: keyword, mode: 'insensitive' as const } },
      ],
      status: 0,
    };

    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          username: true,
          nickname: true,
          avatarUrl: true,
          bio: true,
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.user.count({ where }),
    ]);

    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }
}
