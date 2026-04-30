import { Injectable, OnModuleInit } from '@nestjs/common';
import { RedactingLogger } from '../common/logging/redacting-logger';

export interface GoogleOcrExtractionResult {
  provider: 'google-gemini';
  model: string;
  text: string;
  pageTexts?: string[];
  rawResponse: unknown;
}

interface ExtractTextFromPdfParams {
  fileBuffer: Buffer;
  fileName?: string;
  mimeType?: string;
  prompt?: string;
  timeoutMs?: number;
}

@Injectable()
export class GoogleOcrService implements OnModuleInit {
  private readonly logger = new RedactingLogger(GoogleOcrService.name);
  private readonly apiKey =
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ?? process.env.GOOGLE_API_KEY;
  private readonly configuredModel =
    process.env.GOOGLE_OCR_MODEL ?? 'gemini-2.5-flash';
  private readonly fallbackModels = (
    process.env.GOOGLE_OCR_FALLBACK_MODELS ||
    'gemini-2.5-flash-lite,gemini-1.5-flash'
  )
    .split(',')
    .map((m) => m.trim())
    .filter(Boolean);
  private activeModel: string | null = null;

  isConfigured(): boolean {
    return Boolean(this.apiKey);
  }

  onModuleInit(): void {
    if (!this.apiKey) return;
    this.activeModel = this.configuredModel;
    this.logger.log(`Google OCR primary model configured: ${this.activeModel}`);
  }

  async extractTextFromPdf(
    params: ExtractTextFromPdfParams,
  ): Promise<GoogleOcrExtractionResult> {
    if (!this.apiKey) {
      throw new Error(
        'Google OCR is not configured. Set GOOGLE_GENERATIVE_AI_API_KEY (or GOOGLE_API_KEY).',
      );
    }

    const prompt =
      params.prompt ??
      [
        'Extract all visible text from this document.',
        'Preserve reading order and paragraph boundaries.',
        'For multipage files, label each page as [[PAGE_1]], [[PAGE_2]], etc.',
        'After each page marker, include only that page text before the next marker.',
        'Do not summarize. Return plain text only.',
      ].join(' ');

    const mimeType = params.mimeType ?? 'application/pdf';

    const timeoutMs =
      typeof params.timeoutMs === 'number' && params.timeoutMs > 0
        ? params.timeoutMs
        : 20_000;

    const body = JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt },
            {
              inline_data: {
                mime_type: mimeType,
                data: params.fileBuffer.toString('base64'),
              },
            },
          ],
        },
      ],
    });

    const primaryModel = this.getPreferredModel();
    const modelAttempts = [
      primaryModel,
      ...this.getModelCandidates().filter((m) => m !== primaryModel),
    ];
    const retryDelaysMs = [1200, 2500];
    let lastStatus: number | undefined;
    let lastGoogleErrorMessage: string | null = null;

    for (const model of modelAttempts) {
      let response: globalThis.Response | null = null;
      let payload: unknown = null;

      for (let attempt = 0; attempt <= retryDelaysMs.length; attempt++) {
        response = await fetch(this.buildGenerateContentEndpoint(model), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: AbortSignal.timeout(timeoutMs),
          body,
        });

        payload = await response.json().catch(() => null);
        if (response.ok) {
          this.activeModel = model;
          const extractedText = this.getTextFromGeminiResponse(payload);
          if (!extractedText) {
            this.logger.warn(
              `Google OCR returned no text for file: ${params.fileName ?? 'unknown'}`,
            );
          }
          const pageTexts = this.extractPageTexts(extractedText);
          return {
            provider: 'google-gemini',
            model,
            text: extractedText,
            pageTexts,
            rawResponse: payload,
          };
        }

        if (response.status !== 429 || attempt === retryDelaysMs.length) {
          break;
        }

        const waitMs = retryDelaysMs[attempt];
        this.logger.warn(
          `Google OCR rate-limited (429). Retrying in ${waitMs}ms...`,
        );
        await new Promise((resolve) => setTimeout(resolve, waitMs));
      }

      lastStatus = response?.status;
      lastGoogleErrorMessage =
        (payload as { error?: { message?: string } } | null)?.error?.message ||
        null;
      if (this.shouldTryNextModel(lastStatus, lastGoogleErrorMessage)) {
        this.logger.warn(
          `Google OCR model ${model} unavailable. Trying next Google model.`,
        );
        continue;
      }

      this.logger.warn(
        `Google OCR failed with status ${lastStatus ?? 'unknown'} for model ${model}${
          lastGoogleErrorMessage ? `: ${lastGoogleErrorMessage}` : ''
        }`,
      );
      throw new Error(
        `Google OCR request failed with status ${
          lastStatus ?? 'unknown'
        }${lastGoogleErrorMessage ? `: ${lastGoogleErrorMessage}` : ''}.`,
      );
    }

    throw new Error(
      `Google OCR request failed with status ${
        lastStatus ?? 'unknown'
      }${lastGoogleErrorMessage ? `: ${lastGoogleErrorMessage}` : ''}.`,
    );
  }

  private buildGenerateContentEndpoint(model: string): string {
    return (
      `https://generativelanguage.googleapis.com/v1beta/models/` +
      `${encodeURIComponent(model)}:generateContent?key=${this.apiKey}`
    );
  }

  private getModelCandidates(): string[] {
    return [...new Set([this.configuredModel, ...this.fallbackModels])];
  }

  private shouldTryNextModel(
    status: number | undefined,
    message: string | null,
  ): boolean {
    if (status !== 404) return false;
    const normalized = (message || '').toLowerCase();
    return (
      normalized.includes('no longer available') ||
      normalized.includes('not found') ||
      normalized.includes('not supported') ||
      normalized.length === 0
    );
  }

  private getPreferredModel(): string {
    return this.activeModel ?? this.configuredModel;
  }

  private getTextFromGeminiResponse(payload: unknown): string {
    const candidates = (payload as any)?.candidates;
    if (!Array.isArray(candidates) || candidates.length === 0) {
      return '';
    }

    const parts = candidates?.[0]?.content?.parts;
    if (!Array.isArray(parts)) {
      return '';
    }

    return parts
      .map((part: any) => part?.text)
      .filter((value: unknown): value is string => typeof value === 'string')
      .join('\n')
      .trim();
  }

  private extractPageTexts(rawText: string): string[] | undefined {
    const matches = Array.from(
      rawText.matchAll(
        /\[\[PAGE_(\d{1,5})\]\]\s*([\s\S]*?)(?=\s*\[\[PAGE_\d{1,5}\]\]|\s*$)/g,
      ),
    );
    if (!matches.length) {
      return undefined;
    }

    const pages: string[] = [];
    for (const match of matches) {
      const index = Number.parseInt(match[1], 10);
      const text = (match[2] || '').trim();
      if (!Number.isInteger(index) || index <= 0 || !text) {
        continue;
      }
      pages[index - 1] = text;
    }

    const normalized = pages
      .map((p) => (typeof p === 'string' ? p.trim() : ''))
      .filter((p) => p.length > 0);

    return normalized.length ? normalized : undefined;
  }
}
