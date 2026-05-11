import { Controller, Get, Post, Patch, Delete, Param, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CommentService } from './comment.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('评论')
@ApiBearerAuth()
@Controller('comments')
export class CommentController {
  constructor(private readonly commentService: CommentService) {}

  @Post()
  @ApiOperation({ summary: '发表评论' })
  create(@CurrentUser('id') userId: string, @Body() dto: CreateCommentDto) {
    return this.commentService.create(userId, dto);
  }

  @Public()
  @Get('post/:postId')
  @ApiOperation({ summary: '获取动态评论列表' })
  findByPost(@Param('postId') postId: string, @Query() dto: PaginationDto) {
    return this.commentService.findByPost(postId, dto);
  }

  @Public()
  @Get(':id/replies')
  @ApiOperation({ summary: '获取评论的回复列表' })
  getReplies(@Param('id') id: string, @Query() dto: PaginationDto) {
    return this.commentService.getReplies(id, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取评论基础信息(含 postId)' })
  findOne(@Param('id') id: string) {
    return this.commentService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: '编辑评论' })
  update(@Param('id') id: string, @CurrentUser('id') userId: string, @Body('content') content: string) {
    return this.commentService.update(id, userId, content);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除评论' })
  delete(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.commentService.delete(id, userId);
  }

  @Post(':id/like')
  @ApiOperation({ summary: '点赞/取消点赞评论' })
  like(@CurrentUser('id') userId: string, @Param('id') commentId: string) {
    return this.commentService.like(userId, commentId);
  }
}
