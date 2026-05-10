import { Controller, Get, Post, Patch, Delete, Param, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CircleService } from './circle.service';
import { CreateCircleDto } from './dto/create-circle.dto';
import { UpdateCircleDto } from './dto/update-circle.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('圈子')
@ApiBearerAuth()
@Controller('circles')
export class CircleController {
  constructor(private readonly circleService: CircleService) {}

  @Post()
  @ApiOperation({ summary: '创建圈子' })
  create(@CurrentUser('id') userId: string, @Body() dto: CreateCircleDto) {
    return this.circleService.create(userId, dto);
  }

  @Public()
  @Get()
  @ApiOperation({ summary: '获取圈子列表' })
  findAll(@Query() dto: PaginationDto) {
    return this.circleService.findAll(dto);
  }

  @Get('my')
  @ApiOperation({ summary: '获取圈子列表（含当前用户加入状态）' })
  findAllWithStatus(@CurrentUser('id') userId: string, @Query() dto: PaginationDto) {
    return this.circleService.findAllWithUserStatus(dto, userId);
  }

  @Get('created')
  @ApiOperation({ summary: '获取我创建的圈子' })
  findMyCreated(@CurrentUser('id') userId: string) {
    return this.circleService.findMyCreated(userId);
  }

  @Get('joined')
  @ApiOperation({ summary: '获取我加入的圈子' })
  findMyJoined(@CurrentUser('id') userId: string) {
    return this.circleService.findMyJoined(userId);
  }

  @Get(':id/my-status')
  @ApiOperation({ summary: '获取当前用户在圈子的状态' })
  getMyStatus(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.circleService.getMyStatus(id, userId);
  }

  @Get(':id/pending')
  @ApiOperation({ summary: '获取待审批成员列表' })
  getPendingMembers(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Query() dto: PaginationDto,
  ) {
    return this.circleService.getPendingMembers(id, userId, dto);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: '获取圈子详情' })
  findOne(@Param('id') id: string) {
    return this.circleService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新圈子信息' })
  update(@Param('id') id: string, @CurrentUser('id') userId: string, @Body() dto: UpdateCircleDto) {
    return this.circleService.update(id, userId, dto);
  }

  @Post(':id/invite-code')
  @ApiOperation({ summary: '生成/重置邀请码' })
  generateInviteCode(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.circleService.generateInviteCode(id, userId);
  }

  @Post(':id/join')
  @ApiOperation({ summary: '加入圈子' })
  join(@Param('id') id: string, @CurrentUser('id') userId: string, @Body('inviteCode') inviteCode?: string) {
    return this.circleService.join(id, userId, inviteCode);
  }

  @Post(':id/leave')
  @ApiOperation({ summary: '退出圈子' })
  leave(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.circleService.leave(id, userId);
  }

  @Post(':id/approve/:userId')
  @ApiOperation({ summary: '审批通过' })
  approve(
    @Param('id') circleId: string,
    @Param('userId') targetUserId: string,
    @CurrentUser('id') adminId: string,
  ) {
    return this.circleService.approve(circleId, targetUserId, adminId);
  }

  @Post(':id/reject/:userId')
  @ApiOperation({ summary: '审批拒绝' })
  reject(
    @Param('id') circleId: string,
    @Param('userId') targetUserId: string,
    @CurrentUser('id') adminId: string,
  ) {
    return this.circleService.reject(circleId, targetUserId, adminId);
  }

  @Public()
  @Get(':id/members')
  @ApiOperation({ summary: '获取圈子成员列表' })
  getMembers(@Param('id') id: string, @Query() dto: PaginationDto) {
    return this.circleService.getMembers(id, dto);
  }

  @Get(':id/all-members')
  @ApiOperation({ summary: '获取全部成员（含待审批，仅管理员）' })
  getAllMembers(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Query() dto: PaginationDto,
  ) {
    return this.circleService.getAllMembers(id, userId, dto);
  }

  @Patch(':id/members/:userId/role')
  @ApiOperation({ summary: '修改成员角色' })
  updateMemberRole(
    @Param('id') circleId: string,
    @Param('userId') targetUserId: string,
    @CurrentUser('id') adminId: string,
    @Body('role') role: string,
  ) {
    return this.circleService.updateMemberRole(circleId, targetUserId, role, adminId);
  }

  @Delete(':id/members/:userId')
  @ApiOperation({ summary: '移除成员' })
  removeMember(
    @Param('id') circleId: string,
    @Param('userId') targetUserId: string,
    @CurrentUser('id') adminId: string,
  ) {
    return this.circleService.removeMember(circleId, targetUserId, adminId);
  }
}
