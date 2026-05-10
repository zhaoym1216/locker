import { IsString, IsOptional, IsArray, IsBoolean, IsInt, MaxLength, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCircleDto {
  @ApiProperty({ example: '互联网从业者' })
  @IsString()
  @MaxLength(50)
  name: string;

  @ApiPropertyOptional({ example: '互联网从业者的交流圈子' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({ example: 'INDUSTRY', enum: ['INDUSTRY', 'ALUMNI', 'INTEREST', 'REGION', 'COMPANY', 'PROJECT', 'PAID', 'PRIVATE'] })
  @IsString()
  type: string;

  @ApiProperty({ example: ['EMAIL', 'APPROVAL'] })
  @IsArray()
  @IsString({ each: true })
  authMethods: string[];

  @ApiPropertyOptional({ example: 5000 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100000)
  maxMembers?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}
