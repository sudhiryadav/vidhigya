import { Module } from '@nestjs/common';
import { AdminModule } from '../admin/admin.module';
import { PracticeController } from './practice.controller';

@Module({
  imports: [AdminModule],
  controllers: [PracticeController],
})
export class PracticeModule {}
