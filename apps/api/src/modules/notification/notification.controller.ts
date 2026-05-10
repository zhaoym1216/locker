import { Controller, Get, Patch, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { NotificationService } from './notification.service';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('通知')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  @ApiOperation({ summary: '获取我的通知列表' })
  findMy(@CurrentUser('id') userId: string, @Query() dto: PaginationDto) {
    return this.notificationService.findByUser(userId, dto);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: '标记通知已读' })
  markAsRead(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.notificationService.markAsRead(id, userId);
  }

  @Patch('read-all')
  @ApiOperation({ summary: '全部标记已读' })
  markAllAsRead(@CurrentUser('id') userId: string) {
    return this.notificationService.markAllAsRead(userId);
  }
}
