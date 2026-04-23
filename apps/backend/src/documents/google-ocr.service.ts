import { Injectable } from '@nestjs/common';
import { RedactingLogger } from '../common/logging/redacting-logger';

export interface GoogleOcrExtractionResult {
  provider: 'google-gemini';
  model: string;
  text: string;
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
export class GoogleOcrService {
  private readonly logger = new RedactingLogger(GoogleOcrService.name);
  private readonly apiKey =
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ?? process.env.GOOGLE_API_KEY;
  private readonly model = process.env.GOOGLE_OCR_MODEL ?? 'gemini-2.0-flash';

  isConfigured(): boolean {
    return Boolean(this.apiKey);
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
        'Do not summarize. Return plain text only.',
      ].join(' ');

    const mimeType = params.mimeType ?? 'application/pdf';

    const endpoint =
      `https://generativelanguage.googleapis.com/v1beta/models/` +
      `${encodeURIComponent(this.model)}:generateContent?key=${this.apiKey}`;

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

    let response: globalThis.Response | null = null;
    let payload: unknown = null;
    const retryDelaysMs = [1200, 2500];

    for (let attempt = 0; attempt <= retryDelaysMs.length; attempt++) {
      response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(timeoutMs),
        body,
      });

      payload = await response.json().catch(() => null);
      if (response.ok) break;

      if (response.status !== 429 || attempt === retryDelaysMs.length) {
        break;
      }

      const waitMs = retryDelaysMs[attempt];
      this.logger.warn(
        `Google OCR rate-limited (429). Retrying in ${waitMs}ms...`,
      );
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }

    if (!response?.ok) {
      this.logger.warn(
        `Google OCR failed with status ${response?.status ?? 'unknown'}`,
      );
      throw new Error(
        `Google OCR request failed with status ${response?.status ?? 'unknown'}.`,
      );
    }

    const extractedText = this.getTextFromGeminiResponse(payload);
    if (!extractedText) {
      this.logger.warn(
        `Google OCR returned no text for file: ${params.fileName ?? 'unknown'}`,
      );
    }

    return {
      provider: 'google-gemini',
      model: this.model,
      text: extractedText,
      rawResponse: payload,
    };
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
}
