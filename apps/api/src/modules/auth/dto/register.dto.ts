import { IsString, IsEmail, IsOptional, MinLength, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

function trimOrUndefined({ value }: { value: any }) {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
}

export class RegisterDto {
  @ApiProperty({ example: 'john_doe' })
  @IsString({ message: '用户名必须是字符串' })
  @MinLength(2, { message: '用户名至少2个字符' })
  @MaxLength(50, { message: '用户名最多50个字符' })
  @Transform(trimOrUndefined)
  username: string;

  @ApiProperty({ example: 'password123' })
  @IsString({ message: '密码必须是字符串' })
  @MinLength(6, { message: '密码至少6个字符' })
  @MaxLength(50, { message: '密码最多50个字符' })
  password: string;

  @ApiPropertyOptional({ example: 'John' })
  @IsOptional()
  @IsString({ message: '昵称必须是字符串' })
  @MaxLength(100, { message: '昵称最多100个字符' })
  @Transform(trimOrUndefined)
  nickname?: string;

  @ApiPropertyOptional({ example: 'john@example.com' })
  @IsOptional()
  @IsEmail({}, { message: '请输入有效的邮箱地址' })
  @Transform(trimOrUndefined)
  email?: string;

  @ApiPropertyOptional({ example: '13800138000' })
  @IsOptional()
  @IsString({ message: '手机号必须是字符串' })
  @Transform(trimOrUndefined)
  phone?: string;
}
