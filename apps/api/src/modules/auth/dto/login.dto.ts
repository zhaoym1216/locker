import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'john_doe', description: '用户名/邮箱/手机号' })
  @IsString({ message: '账号必须是字符串' })
  account: string;

  @ApiProperty({ example: 'password123' })
  @IsString({ message: '密码必须是字符串' })
  @MinLength(6, { message: '密码至少6个字符' })
  password: string;
}
