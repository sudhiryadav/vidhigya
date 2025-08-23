import { Module } from '@nestjs/common';
import { PermissionModule } from '../common/permissions/permission.module';
import { PrismaModule } from '../prisma/prisma.module';
import { PracticesController } from './practices.controller';
import { PracticesService } from './practices.service';

@Module({
  imports: [PrismaModule, PermissionModule],
  controllers: [PracticesController],
  providers: [PracticesService],
  exports: [PracticesService],
})
export class PracticesModule {}
