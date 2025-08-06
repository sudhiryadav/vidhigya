import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as mammoth from 'mammoth';
// Dynamic import for pdf-parse to avoid import issues
import { v4 as uuidv4 } from 'uuid';
import * as XLSX from 'xlsx';

export interface ProcessedDocument {
  document_id: string;
  content: string;
  chunks: Array<{
    text: string;
    page_number?: number;
    start_char?: number;
    end_char?: number;
  }>;
  filename: string;
  file_size: number;
  file_type: string;
  pages?: number;
}

@Injectable()
export class DocumentProcessorService {
  private readonly logger = new Logger(DocumentProcessorService.name);

  constructor(private readonly configService: ConfigService) {}

  async processDocument(
    fileBuffer: Buffer,
    originalFilename: string,
    userId: string,
  ): Promise<ProcessedDocument> {
    try {
      const fileExtension = this.getFileExtension(originalFilename);
      let textContent = '';
      let pages = 0;

      // Process different file types
      switch (fileExtension.toLowerCase()) {
        case '.pdf':
          try {
            const pdfResult = await this.processPDF(fileBuffer);
            textContent = pdfResult.text;
            pages = pdfResult.pages;
          } catch (pdfError) {
            this.logger.warn(
              `PDF processing failed for ${originalFilename}, using fallback:`,
              pdfError,
            );
            // Fallback: create a basic document without text content
            textContent = `[PDF file: ${originalFilename} - Text extraction failed]`;
            pages = 0;
          }
          break;

        case '.docx':
        case '.doc':
          textContent = await this.processWordDocument(fileBuffer);
          break;

        case '.txt':
          textContent = await this.processTextFile(fileBuffer);
          break;

        case '.csv':
        case '.xlsx':
        case '.xls':
          textContent = await this.processSpreadsheet(
            fileBuffer,
            fileExtension,
          );
          break;

        default:
          throw new Error(`Unsupported file type: ${fileExtension}`);
      }

      // Clean and chunk the text
      const cleanedText = this.cleanTextContent(textContent);
      const chunks = this.optimizeChunkSize(
        cleanedText,
        fileExtension,
        fileBuffer,
      );

      return {
        document_id: uuidv4(),
        content: cleanedText,
        chunks,
        filename: originalFilename,
        file_size: fileBuffer.length,
        file_type: fileExtension.toLowerCase().replace('.', ''),
        pages,
      };
    } catch (error) {
      this.logger.error(
        `Error processing document ${originalFilename}:`,
        error,
      );
      throw error;
    }
  }

  private getFileExtension(filename: string): string {
    const lastDotIndex = filename.lastIndexOf('.');
    return lastDotIndex !== -1 ? filename.substring(lastDotIndex) : '';
  }

  private async processPDF(
    buffer: Buffer,
  ): Promise<{ text: string; pages: number }> {
    try {
      this.logger.log(
        `Processing PDF with buffer size: ${buffer.length} bytes`,
      );

      if (!buffer || buffer.length === 0) {
        throw new Error('Empty buffer provided for PDF processing');
      }

      const pdfModule = await import('pdf-parse');
      this.logger.log('PDF module loaded:', {
        hasDefault: !!pdfModule.default,
        hasNamedExports: Object.keys(pdfModule).length > 0,
        defaultType: typeof pdfModule.default,
      });

      const pdfParse = pdfModule.default;

      if (typeof pdfParse !== 'function') {
        this.logger.error('pdf-parse is not a function:', {
          type: typeof pdfParse,
          value: pdfParse,
        });
        throw new Error('pdf-parse library not properly loaded');
      }

      this.logger.log('Calling pdf-parse with buffer...');
      const data = await pdfParse(buffer);

      this.logger.log(
        `PDF processed successfully. Pages: ${data.numpages}, Text length: ${data.text?.length || 0}`,
      );

      return {
        text: data.text || '',
        pages: data.numpages || 0,
      };
    } catch (error) {
      this.logger.error('Error processing PDF:', error);
      this.logger.error('PDF buffer info:', {
        bufferLength: buffer?.length,
        bufferType: typeof buffer,
        isBuffer: Buffer.isBuffer(buffer),
      });
      throw new Error(
        'Failed to process PDF file. It may be corrupted or password-protected.',
      );
    }
  }

  private async processWordDocument(buffer: Buffer): Promise<string> {
    try {
      const result = await mammoth.extractRawText({ buffer });
      return result.value;
    } catch (error) {
      this.logger.error('Error processing Word document:', error);
      throw new Error('Failed to process Word document.');
    }
  }

  private async processTextFile(buffer: Buffer): Promise<string> {
    try {
      return buffer.toString('utf-8');
    } catch (error) {
      this.logger.error('Error processing text file:', error);
      throw new Error('Failed to process text file.');
    }
  }

  private async processSpreadsheet(
    buffer: Buffer,
    fileExtension: string,
  ): Promise<string> {
    try {
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      let textContent = '';

      for (const sheetName of workbook.SheetNames) {
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, {
          header: 1,
        }) as any[][];

        textContent += `Sheet: ${sheetName}\n`;
        textContent += this.arrayToMarkdown(jsonData);
        textContent += '\n\n';
      }

      return textContent;
    } catch (error) {
      this.logger.error('Error processing spreadsheet:', error);
      throw new Error('Failed to process spreadsheet file.');
    }
  }

  private arrayToMarkdown(data: any[][]): string {
    if (!data || data.length === 0) return '';

    const headers = data[0];
    let markdown = '| ' + headers.join(' | ') + ' |\n';
    markdown += '| ' + headers.map(() => '---').join(' | ') + ' |\n';

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      markdown +=
        '| ' + row.map((cell) => String(cell || '')).join(' | ') + ' |\n';
    }

    return markdown;
  }

  private cleanTextContent(text: string): string {
    if (!text) return '';

    // Remove NUL characters
    text = text.replace(/\x00/g, '');

    // Remove other control characters except newlines and tabs
    text = text.replace(/[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

    // Normalize whitespace
    text = text.replace(/\s+/g, ' ');

    // Remove leading/trailing whitespace
    return text.trim();
  }

  private optimizeChunkSize(
    text: string,
    fileExtension: string,
    fileBuffer: Buffer,
  ): Array<{
    text: string;
    page_number?: number;
    start_char?: number;
    end_char?: number;
  }> {
    if (!text.trim()) return [];

    const targetSize = 800;
    const sentences = text.split(/(?<=[.!?])\s+/);
    const chunks = [];
    let currentChunk = '';
    let currentPos = 0;

    for (const sentence of sentences) {
      if (currentChunk.length + sentence.length <= targetSize) {
        currentChunk += sentence + ' ';
      } else {
        if (currentChunk) {
          chunks.push({
            text: currentChunk.trim(),
            start_char: currentPos,
            end_char: currentPos + currentChunk.length,
          });
          currentPos += currentChunk.length;
        }
        currentChunk = sentence + ' ';
      }
    }

    if (currentChunk) {
      chunks.push({
        text: currentChunk.trim(),
        start_char: currentPos,
        end_char: currentPos + currentChunk.length,
      });
    }

    return chunks;
  }
}
