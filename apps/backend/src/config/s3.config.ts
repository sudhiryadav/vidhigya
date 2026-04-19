import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedactingLogger } from '../common/logging';

@Injectable()
export class S3Service {
  private readonly logger = new RedactingLogger(S3Service.name);

  private s3Client: S3Client;
  private bucket: string;
  private region: string;
  private configService: ConfigService;
  private initialized = false;

  constructor(configService: ConfigService) {
    this.configService = configService;
  }

  private ensureInitialized() {
    if (!this.initialized) {
      this.initializeS3Client();
      this.initialized = true;
    }
  }

  private initializeS3Client() {
    this.region = this.configService.get<string>('AWS_REGION') || 'us-east-1';
    this.bucket =
      this.configService.get<string>('AWS_S3_BUCKET') || 'vidhigya-documents';

    const accessKeyId = this.configService.get<string>('AWS_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get<string>(
      'AWS_SECRET_ACCESS_KEY',
    );

    if (!accessKeyId || !secretAccessKey) {
      throw new Error('AWS credentials not configured');
    }

    if (!this.bucket) {
      throw new Error('AWS S3 bucket not configured');
    }

    this.s3Client = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }

  async uploadDocument(
    file: Buffer,
    fileName: string,
    contentType: string,
  ): Promise<string> {
    this.ensureInitialized();
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: `documents/${fileName}`,
      Body: file,
      ContentType: contentType,
      ACL: 'private', // Private access
    });

    await this.s3Client.send(command);
    // Return the S3 key instead of public URL
    return `documents/${fileName}`;
  }

  async uploadAvatar(
    file: Buffer,
    fileName: string,
    contentType: string,
  ): Promise<string> {
    this.ensureInitialized();
    // Use the fileName as-is since it already includes the avatars/ prefix
    const s3Key = fileName;

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: s3Key,
      Body: file,
      ContentType: contentType,
      ACL: 'private', // Changed to private for security
    });

    await this.s3Client.send(command);
    return s3Key;
  }

  async getSignedUrl(
    bucket: string,
    key: string,
    expiresIn: number = 3600,
  ): Promise<string> {
    this.ensureInitialized();

    if (!bucket) {
      throw new Error('Bucket parameter is required');
    }

    if (!key) {
      throw new Error('Key parameter is required');
    }

    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    return getSignedUrl(this.s3Client, command, { expiresIn });
  }

  async getDocumentSignedUrl(
    s3Key: string,
    expiresIn: number = 3600,
  ): Promise<string> {
    this.ensureInitialized();

    if (!this.bucket) {
      throw new Error('S3 bucket not configured');
    }

    return this.getSignedUrl(this.bucket, s3Key, expiresIn);
  }

  async getAvatarSignedUrl(
    s3Key: string,
    expiresIn: number = 3600,
  ): Promise<string> {
    this.ensureInitialized();
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: s3Key,
    });

    return getSignedUrl(this.s3Client, command, { expiresIn });
  }

  async getAvatarAsBuffer(s3Key: string): Promise<Buffer> {
    this.ensureInitialized();
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: s3Key,
    });

    try {
      const response = await this.s3Client.send(command);
      if (!response.Body) {
        throw new Error('No body in S3 response');
      }

      // Convert stream to buffer
      const chunks: Uint8Array[] = [];
      const stream = response.Body as any;

      return new Promise((resolve, reject) => {
        stream.on('data', (chunk: Uint8Array) => chunks.push(chunk));
        stream.on('end', () => resolve(Buffer.concat(chunks)));
        stream.on('error', reject);
      });
    } catch (error) {
      this.logger.error('Error getting avatar from S3', error);
      throw error;
    }
  }

  async getDocumentAsBuffer(s3Key: string): Promise<Buffer> {
    this.ensureInitialized();

    if (!this.bucket) {
      throw new Error('S3 bucket not configured');
    }

    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: s3Key,
    });

    try {
      const response = await this.s3Client.send(command);

      if (!response.Body) {
        throw new Error('No body in S3 response');
      }

      // Use traditional stream handling which is more reliable
      const stream = response.Body as any;
      const chunks: Uint8Array[] = [];

      return new Promise((resolve, reject) => {
        stream.on('data', (chunk: Uint8Array) => {
          chunks.push(chunk);
        });

        stream.on('end', () => {
          resolve(Buffer.concat(chunks));
        });

        stream.on('error', (error: unknown) => {
          this.logger.error('Document stream error', error);
          reject(
            error instanceof Error
              ? error
              : new Error(
                  typeof error === 'string' ? error : 'Document stream error',
                ),
          );
        });
      });
    } catch (error) {
      this.logger.error('Error getting document from S3', error);
      throw error;
    }
  }

  async deleteFile(bucket: string, key: string): Promise<void> {
    this.ensureInitialized();

    if (!bucket) {
      throw new Error('Bucket parameter is required for delete');
    }

    if (!key) {
      throw new Error('Key parameter is required for delete');
    }

    this.logger.log(
      `Creating DeleteObjectCommand for bucket: ${bucket}, key: ${key}`,
    );
    const command = new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    try {
      const response = await this.s3Client.send(command);
      this.logger.log(`Delete response:`, {
        statusCode: response.$metadata?.httpStatusCode,
        deleteMarker: response.DeleteMarker,
        versionId: response.VersionId,
      });
    } catch (error) {
      this.logger.error(`Error deleting file from S3: ${error}`);
      throw error;
    }
  }

  async deleteDocument(s3Key: string): Promise<void> {
    this.ensureInitialized();

    this.logger.log(
      `Deleting document from S3: bucket=${this.bucket}, key=${s3Key}`,
    );

    if (!this.bucket) {
      throw new Error('S3 bucket not initialized');
    }

    await this.deleteFile(this.bucket, s3Key);
    this.logger.log(`Document deleted from S3 successfully: ${s3Key}`);
  }

  async deleteAvatar(s3Key: string): Promise<void> {
    this.ensureInitialized();

    if (!this.bucket) {
      throw new Error('S3 bucket not initialized');
    }

    await this.deleteFile(this.bucket, s3Key);
  }

  async checkObjectExists(bucket: string, key: string): Promise<boolean> {
    this.ensureInitialized();

    if (!bucket) {
      throw new Error('Bucket parameter is required for checkObjectExists');
    }

    if (!key) {
      throw new Error('Key parameter is required for checkObjectExists');
    }

    this.logger.log(
      `Checking if object exists in S3: bucket=${bucket}, key=${key}`,
    );

    const command = new HeadObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    try {
      await this.s3Client.send(command);
      this.logger.log(`Object exists: ${key}`);
      return true;
    } catch (error: unknown) {
      const name = error instanceof Error ? error.name : '';
      const status = (error as { $metadata?: { httpStatusCode?: number } })
        ?.$metadata?.httpStatusCode;
      // AWS SDK v3 typically uses NoSuchKey; some paths surface NotFound or 404.
      if (
        name === 'NotFound' ||
        name === 'NoSuchKey' ||
        status === 404
      ) {
        this.logger.log(`Object not found: ${key}`);
        return false;
      }
      this.logger.error(`Error checking object existence: ${error}`);
      throw error;
    }
  }

  async checkDocumentExists(s3Key: string): Promise<boolean> {
    this.ensureInitialized();

    if (!this.bucket) {
      throw new Error('S3 bucket not initialized');
    }

    return this.checkObjectExists(this.bucket, s3Key);
  }

  generateFileName(originalName: string, userId: string): string {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const extension = originalName.split('.').pop();
    const baseName = originalName.substring(0, originalName.lastIndexOf('.'));
    // Preserve original filename with timestamp and random string for uniqueness
    return `${userId}_${timestamp}_${randomString}_${baseName}.${extension}`;
  }
}
