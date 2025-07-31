import { FileValidator } from '@nestjs/common';

export interface MaxFileSizeValidatorOptions {
  maxSize: number;
}

export class MaxFileSizeValidator extends FileValidator<MaxFileSizeValidatorOptions> {
  constructor(options: MaxFileSizeValidatorOptions) {
    super(options);
  }

  isValid(file?: Express.Multer.File): boolean {
    if (!file) {
      return false;
    }
    return file.size <= this.validationOptions.maxSize;
  }

  buildErrorMessage(): string {
    return `File size exceeds ${this.validationOptions.maxSize} bytes`;
  }
}
