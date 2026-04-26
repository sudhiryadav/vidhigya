import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as Handlebars from 'handlebars';
import nodemailer from 'nodemailer';
import * as path from 'path';
import { RedactingLogger } from '../common/logging';

interface SendTemplateEmailInput {
  to: string;
  subject: string;
  templateName: string;
  context: Record<string, unknown>;
}

@Injectable()
export class EmailService {
  private readonly logger = new RedactingLogger(EmailService.name);
  private transporter?: ReturnType<typeof nodemailer.createTransport>;

  constructor(private readonly configService: ConfigService) {
    this.initializeTransporter();
  }

  private getFirstConfigValue(keys: string[]): string | undefined {
    for (const key of keys) {
      const value = this.configService.get<string>(key);
      if (value && value.trim()) {
        return value;
      }
    }
    return undefined;
  }

  private initializeTransporter() {
    const host = this.getFirstConfigValue(['SMTP_HOST', 'EMAIL_HOST']);
    const user = this.getFirstConfigValue([
      'SMTP_USER',
      'SMTP_USERNAME',
      'EMAIL_USER',
    ]);
    const pass = this.getFirstConfigValue([
      'SMTP_PASS',
      'SMTP_PASSWORD',
      'EMAIL_PASS',
    ]);
    const port = Number(
      this.getFirstConfigValue(['SMTP_PORT', 'EMAIL_PORT']) || '587',
    );
    const secure =
      (
        this.getFirstConfigValue(['SMTP_SECURE', 'EMAIL_SECURE']) || 'false'
      ).toLowerCase() === 'true';

    if (!host || !user || !pass) {
      this.logger.warn(
        'SMTP config missing (SMTP_HOST/SMTP_USER/SMTP_PASS). Email delivery disabled.',
      );
      return;
    }

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
    });
  }

  isEnabled(): boolean {
    return Boolean(this.transporter);
  }

  async sendTemplateEmail(input: SendTemplateEmailInput): Promise<boolean> {
    if (!this.transporter) {
      return false;
    }

    const fromEmail = this.getFirstConfigValue([
      'SMTP_FROM_EMAIL',
      'SMTP_FROM',
      'EMAIL_FROM',
    ]);
    const fromName =
      this.getFirstConfigValue(['SMTP_FROM_NAME', 'EMAIL_FROM_NAME']) ||
      'Vidhigya';

    if (!fromEmail) {
      this.logger.warn('SMTP_FROM_EMAIL is missing. Email delivery disabled.');
      return false;
    }

    try {
      const html = this.renderTemplate(
        input.templateName,
        this.buildBaseContext(input.context, fromName),
      );

      await this.transporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to: input.to,
        subject: input.subject,
        html,
      });

      return true;
    } catch (error) {
      this.logger.error('Failed to send email', error as Error, {
        to: input.to,
        subject: input.subject,
        templateName: input.templateName,
      });
      return false;
    }
  }

  renderTemplateForPreview(
    templateName: string,
    context: Record<string, unknown>,
  ): string {
    const fromName =
      this.getFirstConfigValue(['SMTP_FROM_NAME', 'EMAIL_FROM_NAME']) ||
      'Vidhigya';
    return this.renderTemplate(
      templateName,
      this.buildBaseContext(context, fromName),
    );
  }

  private renderTemplate(
    templateName: string,
    context: Record<string, unknown>,
  ): string {
    const header = this.readTemplate('header');
    const body = this.readTemplate(templateName);
    const footer = this.readTemplate('footer');

    const source = `${header}\n${body}\n${footer}`;
    const template = Handlebars.compile(source);
    return template(context);
  }

  private buildBaseContext(
    context: Record<string, unknown>,
    fromName: string,
  ): Record<string, unknown> {
    return {
      brandName: fromName,
      currentYear: new Date().getFullYear(),
      ...context,
    };
  }

  private readTemplate(templateName: string): string {
    const fileName = `${templateName}.hbs`;
    const candidatePaths = [
      path.resolve(process.cwd(), 'src', 'email', 'templates', fileName),
      path.resolve(__dirname, 'templates', fileName),
    ];

    for (const candidatePath of candidatePaths) {
      if (fs.existsSync(candidatePath)) {
        return fs.readFileSync(candidatePath, 'utf-8');
      }
    }

    throw new Error(`Email template not found: ${fileName}`);
  }
}
