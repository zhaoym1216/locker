import { Controller, Get, Post, Patch, Delete, Param, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PostService } from './post.service';
import { CreatePostDto } from './dto/create-post.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('动态')
@ApiBearerAuth()
@Controller('posts')
export class PostController {
  constructor(private readonly postService: PostService) {}

  @Post()
  @ApiOperation({ summary: '发布动态' })
  create(@CurrentUser('id') userId: string, @Body() dto: CreatePostDto) {
    return this.postService.create(userId, dto);
  }

  @Get('feed')
  @ApiOperation({ summary: '获取动态流（所有已加入圈子的帖子）' })
  findFeed(@CurrentUser('id') userId: string, @Query() dto: PaginationDto) {
    return this.postService.findFeed(dto, userId);
  }

  @Get('circle/:circleId')
  @ApiOperation({ summary: '获取圈子动态列表（仅成员可见）' })
  findByCircle(@CurrentUser('id') userId: string, @Param('circleId') circleId: string, @Query() dto: PaginationDto) {
    return this.postService.findByCircle(circleId, dto, userId);
  }

  @Get('user/:userId')
  @ApiOperation({ summary: '获取用户的动态（仅查看者也加入的圈子）' })
  findByUser(@CurrentUser('id') viewerId: string, @Param('userId') userId: string, @Query() dto: PaginationDto) {
    return this.postService.findByUser(userId, dto, viewerId);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取动态详情(仅圈内成员可见)' })
  findOne(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.postService.findOne(id, userId);
  }

  @Post(':id/like')
  @ApiOperation({ summary: '点赞/取消点赞' })
  like(@CurrentUser('id') userId: string, @Param('id') postId: string) {
    return this.postService.like(userId, postId);
  }

  @Patch(':id')
  @ApiOperation({ summary: '编辑动态' })
  update(@CurrentUser('id') userId: string, @Param('id') postId: string, @Body('content') content: string) {
    return this.postService.update(userId, postId, content);
  }

  @Post(':id/pin')
  @ApiOperation({ summary: '置顶/取消置顶' })
  pin(@CurrentUser('id') userId: string, @Param('id') postId: string, @Body('pinned') pinned: boolean) {
    return this.postService.pin(userId, postId, pinned);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除动态' })
  delete(@CurrentUser('id') userId: string, @Param('id') postId: string) {
    return this.postService.delete(userId, postId);
  }
}
