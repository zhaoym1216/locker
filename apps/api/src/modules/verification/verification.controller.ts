import { Controller, Get, Post, Delete, Body, Param, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { VerificationService } from './verification.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('认证')
@ApiBearerAuth()
@Controller('verification')
export class VerificationController {
  constructor(private readonly verificationService: VerificationService) {}

  @Get()
  @ApiOperation({ summary: '获取当前用户的认证记录' })
  list(@CurrentUser('id') userId: string) {
    return this.verificationService.list(userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除认证记录' })
  remove(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.verificationService.remove(userId, id);
  }

  @Post('email/send')
  @ApiOperation({ summary: '发送邮箱验证码' })
  sendEmailCode(@CurrentUser('id') userId: string, @Body('email') email: string) {
    return this.verificationService.sendEmailCode(userId, email);
  }

  @Post('email/verify')
  @ApiOperation({ summary: '验证邮箱' })
  verifyEmail(@CurrentUser('id') userId: string, @Body('email') email: string, @Body('code') code: string) {
    return this.verificationService.verifyEmail(userId, email, code);
  }

  @Post('location')
  @ApiOperation({ summary: '位置认证（支持传入城市名或经纬度）' })
  async verifyLocation(
    @CurrentUser('id') userId: string,
    @Body('city') city?: string,
    @Body('lat') lat?: number,
    @Body('lng') lng?: number,
  ) {
    if (lat != null && lng != null) {
      const resolvedCity = await this.verificationService.reverseGeocode(lat, lng);
      return this.verificationService.verifyLocation(userId, resolvedCity);
    }
    if (!city) throw new BadRequestException('请提供城市名或经纬度');
    return this.verificationService.verifyLocation(userId, city);
  }
}
