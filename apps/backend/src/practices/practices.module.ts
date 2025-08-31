import { Module } from '@nestjs/common';
import { AdminModule } from '../admin/admin.module';
import { PermissionModule } from '../common/permissions/permission.module';
import { PrismaModule } from '../prisma/prisma.module';
import { PracticeController } from './practice.controller';
import { PracticesController } from './practices.controller';
import { PracticesService } from './practices.service';

@Module({
  imports: [PrismaModule, PermissionModule, AdminModule],
  controllers: [PracticesController, PracticeController],
  providers: [PracticesService],
  exports: [PracticesService],
})
export class PracticesModule {}
