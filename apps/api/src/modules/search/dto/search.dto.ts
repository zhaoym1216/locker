import { IsOptional, IsString, IsIn } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class SearchDto extends PaginationDto {
  @ApiPropertyOptional({ description: '搜索关键词' })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ description: '搜索类型', enum: ['all', 'user', 'circle', 'post'], default: 'all' })
  @IsOptional()
  @IsString()
  @IsIn(['all', 'user', 'circle', 'post'])
  type?: string;
}
