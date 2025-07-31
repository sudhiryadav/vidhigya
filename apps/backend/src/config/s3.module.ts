import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { S3Service } from './s3.config';

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: S3Service,
      useFactory: (configService: ConfigService) => {
        return new S3Service(configService);
      },
      inject: [ConfigService],
    },
  ],
  exports: [S3Service],
})
export class S3Module {}
