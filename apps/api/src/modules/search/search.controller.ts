import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SearchService } from './search.service';
import { SearchDto } from './dto/search.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('搜索与话题')
@ApiBearerAuth()
@Controller()
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get('search')
  @ApiOperation({ summary: '统一搜索' })
  search(
    @CurrentUser('id') userId: string,
    @Query() dto: SearchDto,
  ) {
    const q = dto.q?.trim() || '';
    const type = dto.type || 'all';
    if (!q) {
      return type === 'all' ? { users: [], circles: [], posts: [] } : { items: [], total: 0, page: 1, pageSize: 20, totalPages: 0 };
    }
    if (type === 'user') return this.searchService.searchUsers(q, dto);
    if (type === 'circle') return this.searchService.searchCircles(q, dto);
    if (type === 'post') return this.searchService.searchPosts(q, userId, dto);
    return this.searchService.searchAll(q, userId);
  }

  @Get('tags/hot')
  @ApiOperation({ summary: '热门话题' })
  getHotTags() {
    return this.searchService.getHotTags();
  }

  @Get('tags/:name')
  @ApiOperation({ summary: '话题详情' })
  async getTagDetail(@Param('name') name: string) {
    const detail = await this.searchService.getTagDetail(name);
    if (!detail) return { name, postCount: 0, participantCount: 0, exists: false };
    return detail;
  }

  @Get('posts/tag/:name')
  @ApiOperation({ summary: '话题下的帖子列表' })
  getPostsByTag(
    @CurrentUser('id') userId: string,
    @Param('name') name: string,
    @Query() dto: PaginationDto,
  ) {
    return this.searchService.getPostsByTag(name, dto, userId);
  }
}
