import { Controller, Get, Patch, Param, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UserService } from './user.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('用户')
@ApiBearerAuth()
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

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
}
