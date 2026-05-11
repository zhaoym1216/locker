import { Module } from '@nestjs/common';
import { FollowService } from './follow.service';

@Module({
  providers: [FollowService],
  exports: [FollowService],
})
export class FollowModule {}
