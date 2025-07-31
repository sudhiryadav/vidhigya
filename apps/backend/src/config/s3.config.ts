import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class S3Service {
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

    console.log(
      `S3 Configuration: region=${this.region}, bucket=${this.bucket}`,
    );
    console.log(`AWS Access Key ID: ${accessKeyId ? 'configured' : 'missing'}`);
    console.log(
      `AWS Secret Access Key: ${secretAccessKey ? 'configured' : 'missing'}`,
    );

    if (!accessKeyId || !secretAccessKey) {
      throw new Error('AWS credentials not configured');
    }

    this.s3Client = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });

    console.log('S3 client initialized successfully');
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

    console.log(`Uploading avatar to S3: bucket=${this.bucket}, key=${s3Key}`);

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: s3Key,
      Body: file,
      ContentType: contentType,
      ACL: 'private', // Changed to private for security
    });

    await this.s3Client.send(command);
    console.log(`Successfully uploaded avatar to S3: ${s3Key}`);

    // Return the S3 key instead of public URL
    return s3Key;
  }

  async getSignedUrl(
    bucket: string,
    key: string,
    expiresIn: number = 3600,
  ): Promise<string> {
    this.ensureInitialized();
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
      console.error(`Error getting avatar from S3: ${error}`);
      throw error;
    }
  }

  async deleteFile(bucket: string, key: string): Promise<void> {
    this.ensureInitialized();
    const command = new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    await this.s3Client.send(command);
  }

  async deleteDocument(s3Key: string): Promise<void> {
    await this.deleteFile(this.bucket, s3Key);
  }

  async deleteAvatar(s3Key: string): Promise<void> {
    await this.deleteFile(this.bucket, s3Key);
  }

  generateFileName(originalName: string, userId: string): string {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const extension = originalName.split('.').pop();
    return `${userId}_${timestamp}_${randomString}.${extension}`;
  }
}
