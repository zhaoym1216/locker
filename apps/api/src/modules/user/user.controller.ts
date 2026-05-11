import { Controller, Get, Post, Patch, Delete, Param, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UserService } from './user.service';
import { FollowService } from '../follow/follow.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('用户')
@ApiBearerAuth()
@Controller('users')
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly followService: FollowService,
  ) {}

  @Get('me')
  @ApiOperation({ summary: '获取当前用户信息' })
  getMe(@CurrentUser('id') userId: string) {
    return this.userService.findById(userId);
  }

  @Patch('me')
  @ApiOperation({ summary: '更新当前用户资料' })
  updateMe(@CurrentUser('id') userId: string, @Body() dto: UpdateUserDto) {
    return this.userService.updateProfile(userId, dto);
  }

  @Public()
  @Get('search')
  @ApiOperation({ summary: '搜索用户' })
  search(@Query('q') keyword: string, @Query('page') page?: number, @Query('pageSize') pageSize?: number) {
    return this.userService.search(keyword, page, pageSize);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: '获取用户详情' })
  findOne(@Param('id') id: string) {
    return this.userService.findById(id);
  }

  @Public()
  @Get(':id/circles')
  @ApiOperation({ summary: '获取用户加入的公开圈子' })
  getCircles(@Param('id') id: string) {
    return this.userService.getUserCircles(id);
  }

  @Post(':id/follow')
  @ApiOperation({ summary: '关注用户' })
  follow(@CurrentUser('id') myId: string, @Param('id') targetId: string) {
    return this.followService.follow(myId, targetId);
  }

  @Delete(':id/follow')
  @ApiOperation({ summary: '取消关注' })
  unfollow(@CurrentUser('id') myId: string, @Param('id') targetId: string) {
    return this.followService.unfollow(myId, targetId);
  }

  @Get(':id/follow-status')
  @ApiOperation({ summary: '获取与该用户的关注关系' })
  followStatus(@CurrentUser('id') myId: string, @Param('id') targetId: string) {
    return this.followService.getStatus(myId, targetId);
  }

  @Get(':id/followers')
  @ApiOperation({ summary: '获取粉丝列表' })
  followers(@Param('id') id: string, @CurrentUser('id') myId: string, @Query() dto: PaginationDto) {
    return this.followService.getFollowers(id, dto, myId);
  }

  @Get(':id/following')
  @ApiOperation({ summary: '获取关注列表' })
  following(@Param('id') id: string, @CurrentUser('id') myId: string, @Query() dto: PaginationDto) {
    return this.followService.getFollowing(id, dto, myId);
  }
}
