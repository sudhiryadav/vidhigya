import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { PermissionAuditService } from './permission-audit.service';
import { PermissionCacheService } from './permission-cache.service';
import { PermissionController } from './permission.controller';
import { PermissionGuard } from './permission.guard';
import { PermissionService } from './permission.service';

@Module({
  imports: [PrismaModule],
  controllers: [PermissionController],
  providers: [
    PermissionService,
    PermissionGuard,
    PermissionCacheService,
    PermissionAuditService,
  ],
  exports: [
    PermissionService,
    PermissionGuard,
    PermissionCacheService,
    PermissionAuditService,
  ],
})
export class PermissionModule {}
