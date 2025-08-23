import { Module } from '@nestjs/common';
import { CasesController } from './cases.controller';
import { CasesService } from './cases.service';
import { PrismaModule } from '../prisma/prisma.module';
import { PermissionModule } from '../common/permissions/permission.module';

@Module({
  imports: [PrismaModule, PermissionModule],
  controllers: [CasesController],
  providers: [CasesService],
  exports: [CasesService],
})
export class CasesModule {}
