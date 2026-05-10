import { IsString, IsOptional, IsArray, IsBoolean, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePostDto {
  @ApiProperty({ description: '圈子ID' })
  @IsString()
  circleId: string;

  @ApiProperty({ example: '分享一下今天的收获' })
  @IsString()
  @MaxLength(5000)
  content: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  mediaUrls?: string[];

  @ApiPropertyOptional({ example: 'TEXT', enum: ['TEXT', 'IMAGE', 'VIDEO', 'LINK', 'ANONYMOUS'] })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isAnonymous?: boolean;
}
