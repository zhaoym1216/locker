import { Injectable, NotFoundException, ForbiddenException, ConflictException, BadRequestException } from '@nestjs/common';

const SYSTEM_ONLY_TYPES = ['COMPANY', 'ALUMNI', 'REGION'];
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { CreateCircleDto } from './dto/create-circle.dto';
import { UpdateCircleDto } from './dto/update-circle.dto';
import { PaginationDto, PaginatedResult } from '../../common/dto/pagination.dto';

@Injectable()
export class CircleService {
  constructor(
    private prisma: PrismaService,
    private notificationService: NotificationService,
  ) {}

  async create(userId: string, dto: CreateCircleDto) {
    if (SYSTEM_ONLY_TYPES.includes(dto.type)) {
      throw new BadRequestException('该圈子类型由系统自动创建，无法手动创建');
    }
    return this.prisma.circle.create({
      data: {
        ...dto,
        ownerId: userId,
        members: {
          create: { userId, role: 'OWNER', status: 1 },
        },
      },
    });
  }

  async findAll(dto: PaginationDto): Promise<PaginatedResult<any>> {
    const where = { isPublic: true, status: 0, isSystem: false };
    const [items, total] = await Promise.all([
      this.prisma.circle.findMany({
        where,
        orderBy: { memberCount: 'desc' },
        skip: dto.skip,
        take: dto.pageSize,
      }),
      this.prisma.circle.count({ where }),
    ]);
    return { items, total, page: dto.page, pageSize: dto.pageSize, totalPages: Math.ceil(total / dto.pageSize) };
  }

  async findAllWithUserStatus(dto: PaginationDto, userId: string): Promise<PaginatedResult<any>> {
    const where = { isPublic: true, status: 0, isSystem: false };
    const [items, total, memberships] = await Promise.all([
      this.prisma.circle.findMany({
        where,
        orderBy: { memberCount: 'desc' },
        skip: dto.skip,
        take: dto.pageSize,
      }),
      this.prisma.circle.count({ where }),
      this.prisma.circleMember.findMany({
        where: { userId, circle: where },
        select: { circleId: true, status: true },
      }),
    ]);
    const statusMap = new Map(memberships.map(m => [m.circleId, m.status]));
    const itemsWithStatus = items.map(circle => ({
      ...circle,
      memberStatus: statusMap.has(circle.id) ? statusMap.get(circle.id) : null,
    }));
    return { items: itemsWithStatus, total, page: dto.page, pageSize: dto.pageSize, totalPages: Math.ceil(total / dto.pageSize) };
  }

  async findOne(id: string) {
    const circle = await this.prisma.circle.findUnique({
      where: { id },
      include: { _count: { select: { members: true, posts: true } } },
    });
    if (!circle) throw new NotFoundException('圈子不存在');
    return circle;
  }

  async update(circleId: string, userId: string, dto: UpdateCircleDto) {
    await this.checkRole(circleId, userId, ['OWNER', 'ADMIN']);
    const circle = await this.prisma.circle.findUnique({ where: { id: circleId } });
    if (!circle) throw new BadRequestException('圈子不存在');

    // 系统圈子不允许修改加入途径和可见性
    if (circle.isSystem) {
      delete (dto as any).authMethods;
      delete (dto as any).isPublic;
    }
    return this.prisma.circle.update({ where: { id: circleId }, data: dto });
  }

  async join(circleId: string, userId: string, inviteCode?: string) {
    const existing = await this.prisma.circleMember.findUnique({
      where: { circleId_userId: { circleId, userId } },
    });
    if (existing) {
      if (existing.status === 0) throw new ConflictException('已提交申请，请等待审批');
      if (existing.status === 1) throw new ConflictException('已是圈子成员');
      if (existing.status === 2) throw new ConflictException('申请已被拒绝');
      if (existing.status === 3) throw new ForbiddenException('已被封禁，无法加入');
    }

    const circle = await this.prisma.circle.findUnique({ where: { id: circleId } });
    if (!circle) throw new NotFoundException('圈子不存在');

    // 邀请码验证
    if (circle.authMethods.includes('INVITE_CODE')) {
      if (!inviteCode) throw new BadRequestException('请输入邀请码');
      if (circle.inviteCode !== inviteCode) throw new BadRequestException('邀请码错误');
    }

    const needsApproval = circle.authMethods.includes('APPROVAL');
    const status = needsApproval ? 0 : 1;

    if (status === 1) {
      // 直接通过，memberCount +1
      const [, member] = await this.prisma.$transaction([
        this.prisma.circle.update({
          where: { id: circleId },
          data: { memberCount: { increment: 1 } },
        }),
        this.prisma.circleMember.create({
          data: { circleId, userId, role: 'MEMBER', status: 1 },
        }),
      ]);
      return member;
    } else {
      // 待审批，不增加 memberCount
      const member = await this.prisma.circleMember.create({
        data: { circleId, userId, role: 'MEMBER', status: 0 },
      });

      // 通知圈主和管理员
      const admins = await this.prisma.circleMember.findMany({
        where: { circleId, role: { in: ['OWNER', 'ADMIN'] }, status: 1 },
        select: { userId: true },
      });
      const applicant = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { nickname: true },
      });
      for (const admin of admins) {
        await this.notificationService.create({
          userId: admin.userId,
          actorId: userId,
          type: 'circle_apply',
          targetType: 0,
          targetId: circleId,
          content: `${applicant?.nickname || '用户'} 申请加入圈子「${circle.name}」`,
        });
      }

      return member;
    }
  }

  async approve(circleId: string, targetUserId: string, adminId: string) {
    await this.checkRole(circleId, adminId, ['OWNER', 'ADMIN']);

    const member = await this.prisma.circleMember.findUnique({
      where: { circleId_userId: { circleId, userId: targetUserId } },
    });
    if (!member) throw new NotFoundException('该用户未申请加入此圈子');
    if (member.status === 1) throw new ConflictException('该用户已是圈子成员');
    if (member.status !== 0) throw new BadRequestException('该申请状态异常');

    const [, updated] = await this.prisma.$transaction([
      this.prisma.circle.update({
        where: { id: circleId },
        data: { memberCount: { increment: 1 } },
      }),
      this.prisma.circleMember.update({
        where: { circleId_userId: { circleId, userId: targetUserId } },
        data: { status: 1 },
      }),
    ]);

    const circle = await this.prisma.circle.findUnique({ where: { id: circleId }, select: { name: true } });
    await this.notificationService.create({
      userId: targetUserId,
      actorId: adminId,
      type: 'circle_approved',
      targetType: 0,
      targetId: circleId,
      content: `你加入圈子「${circle?.name}」的申请已通过`,
    });

    return updated;
  }

  async reject(circleId: string, targetUserId: string, adminId: string) {
    await this.checkRole(circleId, adminId, ['OWNER', 'ADMIN']);

    const member = await this.prisma.circleMember.findUnique({
      where: { circleId_userId: { circleId, userId: targetUserId } },
    });
    if (!member) throw new NotFoundException('该用户未申请加入此圈子');
    if (member.status !== 0) throw new BadRequestException('只能拒绝待审批的申请');

    await this.prisma.circleMember.delete({
      where: { circleId_userId: { circleId, userId: targetUserId } },
    });

    const circle = await this.prisma.circle.findUnique({ where: { id: circleId }, select: { name: true } });
    await this.notificationService.create({
      userId: targetUserId,
      actorId: adminId,
      type: 'circle_rejected',
      targetType: 0,
      targetId: circleId,
      content: `你加入圈子「${circle?.name}」的申请已被拒绝`,
    });

    return { rejected: true };
  }

  async getPendingMembers(circleId: string, userId: string, dto: PaginationDto) {
    await this.checkRole(circleId, userId, ['OWNER', 'ADMIN']);

    const [items, total] = await Promise.all([
      this.prisma.circleMember.findMany({
        where: { circleId, status: 0 },
        include: { user: { select: { id: true, username: true, nickname: true, avatarUrl: true } } },
        orderBy: { joinedAt: 'desc' },
        skip: dto.skip,
        take: dto.pageSize,
      }),
      this.prisma.circleMember.count({ where: { circleId, status: 0 } }),
    ]);
    return { items, total, page: dto.page, pageSize: dto.pageSize, totalPages: Math.ceil(total / dto.pageSize) };
  }

  async getMyStatus(circleId: string, userId: string) {
    const member = await this.prisma.circleMember.findUnique({
      where: { circleId_userId: { circleId, userId } },
      select: { status: true, role: true },
    });
    if (!member) return { status: null, role: null };
    return { status: member.status, role: member.role };
  }

  async leave(circleId: string, userId: string) {
    const member = await this.prisma.circleMember.findUnique({
      where: { circleId_userId: { circleId, userId } },
    });
    if (!member) throw new NotFoundException('不是圈子成员');
    if (member.role === 'OWNER') throw new ForbiddenException('圈主不能退出圈子');

    const decrement = member.status === 1 ? 1 : 0;
    const [, deleted] = await this.prisma.$transaction([
      decrement > 0
        ? this.prisma.circle.update({ where: { id: circleId }, data: { memberCount: { decrement: 1 } } })
        : this.prisma.circle.update({ where: { id: circleId }, data: {} }),
      this.prisma.circleMember.delete({
        where: { circleId_userId: { circleId, userId } },
      }),
    ]);

    return deleted;
  }

  async getMembers(circleId: string, dto: PaginationDto) {
    const [items, total] = await Promise.all([
      this.prisma.circleMember.findMany({
        where: { circleId, status: 1 },
        include: { user: { select: { id: true, username: true, nickname: true, avatarUrl: true } } },
        skip: dto.skip,
        take: dto.pageSize,
      }),
      this.prisma.circleMember.count({ where: { circleId, status: 1 } }),
    ]);
    return { items, total, page: dto.page, pageSize: dto.pageSize, totalPages: Math.ceil(total / dto.pageSize) };
  }

  async getAllMembers(circleId: string, userId: string, dto: PaginationDto) {
    await this.checkRole(circleId, userId, ['OWNER', 'ADMIN']);
    const [items, total] = await Promise.all([
      this.prisma.circleMember.findMany({
        where: { circleId },
        include: { user: { select: { id: true, username: true, nickname: true, avatarUrl: true } } },
        orderBy: [{ role: 'asc' }, { joinedAt: 'asc' }],
        skip: dto.skip,
        take: dto.pageSize,
      }),
      this.prisma.circleMember.count({ where: { circleId } }),
    ]);
    return { items, total, page: dto.page, pageSize: dto.pageSize, totalPages: Math.ceil(total / dto.pageSize) };
  }

  async updateMemberRole(circleId: string, targetUserId: string, newRole: string, adminId: string) {
    await this.checkRole(circleId, adminId, ['OWNER']);

    if (!['ADMIN', 'MEMBER'].includes(newRole)) {
      throw new BadRequestException('角色只能是 ADMIN 或 MEMBER');
    }

    const target = await this.prisma.circleMember.findUnique({
      where: { circleId_userId: { circleId, userId: targetUserId } },
    });
    if (!target) throw new NotFoundException('该用户不是圈子成员');
    if (target.role === 'OWNER') throw new ForbiddenException('不能修改圈主角色');

    return this.prisma.circleMember.update({
      where: { circleId_userId: { circleId, userId: targetUserId } },
      data: { role: newRole },
      include: { user: { select: { id: true, username: true, nickname: true } } },
    });
  }

  async removeMember(circleId: string, targetUserId: string, adminId: string) {
    await this.checkRole(circleId, adminId, ['OWNER', 'ADMIN']);

    const target = await this.prisma.circleMember.findUnique({
      where: { circleId_userId: { circleId, userId: targetUserId } },
    });
    if (!target) throw new NotFoundException('该用户不是圈子成员');
    if (target.role === 'OWNER') throw new ForbiddenException('不能移除圈主');

    const decrement = target.status === 1 ? 1 : 0;
    await this.prisma.$transaction([
      decrement > 0
        ? this.prisma.circle.update({ where: { id: circleId }, data: { memberCount: { decrement: 1 } } })
        : this.prisma.circle.update({ where: { id: circleId }, data: {} }),
      this.prisma.circleMember.delete({
        where: { circleId_userId: { circleId, userId: targetUserId } },
      }),
    ]);

    return { removed: true };
  }

  async findMyCreated(userId: string): Promise<any[]> {
    return this.prisma.circle.findMany({
      where: { ownerId: userId },
      include: { _count: { select: { members: true, posts: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findMyJoined(userId: string): Promise<any[]> {
    const memberships = await this.prisma.circleMember.findMany({
      where: { userId, status: 1, role: { not: 'OWNER' } },
      include: {
        circle: {
          include: { _count: { select: { members: true, posts: true } } },
        },
      },
      orderBy: { joinedAt: 'desc' },
    });
    return memberships.map((m) => m.circle);
  }

  async generateInviteCode(circleId: string, userId: string) {
    await this.checkRole(circleId, userId, ['OWNER', 'ADMIN']);
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    return this.prisma.circle.update({
      where: { id: circleId },
      data: { inviteCode: code },
      select: { inviteCode: true },
    });
  }

  private async checkRole(circleId: string, userId: string, roles: string[]) {
    const member = await this.prisma.circleMember.findUnique({
      where: { circleId_userId: { circleId, userId } },
    });
    if (!member || !roles.includes(member.role)) {
      throw new ForbiddenException('没有权限执行此操作');
    }
  }
}
