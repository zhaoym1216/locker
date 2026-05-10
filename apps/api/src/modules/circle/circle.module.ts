import { Module } from '@nestjs/common';
import { CircleService } from './circle.service';
import { CircleController } from './circle.controller';

@Module({
  controllers: [CircleController],
  providers: [CircleService],
  exports: [CircleService],
})
export class CircleModule {}
