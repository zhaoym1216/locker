import { IsString, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCommentDto {
  @ApiProperty({ description: '动态ID' })
  @IsString()
  postId: string;

  @ApiProperty({ example: '说得好！' })
  @IsString()
  @MaxLength(2000)
  content: string;

  @ApiPropertyOptional({ description: '父评论ID（楼中楼）' })
  @IsOptional()
  @IsString()
  parentId?: string;

  @ApiPropertyOptional({ description: '回复哪条评论' })
  @IsOptional()
  @IsString()
  replyToId?: string;
}
