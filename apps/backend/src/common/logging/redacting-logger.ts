import {
  ConsoleLogger,
  type LoggerService,
  type LogLevel,
} from '@nestjs/common';
import { redactUnknown } from './redact';

/**
 * Nest application logger that redacts strings and nested objects before any output.
 *
 * Implements `LoggerService` without subclassing `Logger` or `ConsoleLogger` (Nest 9+
 * disallows extending `Logger`; subclassing `ConsoleLogger` is optional).
 *
 * Redaction runs on every argument **before** delegating to an internal `ConsoleLogger`.
 * What reaches stdout/stderr is already redacted—use this (or a file/SIEM sink) to avoid
 * leaking secrets into process logs; switching away from `ConsoleLogger` formatting alone
 * does not remove stdout from container journald/Kubernetes unless you change the sink.
 */
export class RedactingLogger implements LoggerService {
  private readonly sink: ConsoleLogger;

  constructor(context?: string) {
    this.sink = new ConsoleLogger(context);
  }

  log(message: unknown, ...optionalParams: unknown[]): void {
    this.sink.log(
      redactUnknown(message) as never,
      ...optionalParams.map((p) => redactUnknown(p)),
    );
  }

  error(message: unknown, ...optionalParams: unknown[]): void {
    this.sink.error(
      redactUnknown(message) as never,
      ...optionalParams.map((p) => redactUnknown(p)),
    );
  }

  warn(message: unknown, ...optionalParams: unknown[]): void {
    this.sink.warn(
      redactUnknown(message) as never,
      ...optionalParams.map((p) => redactUnknown(p)),
    );
  }

  debug(message: unknown, ...optionalParams: unknown[]): void {
    this.sink.debug(
      redactUnknown(message) as never,
      ...optionalParams.map((p) => redactUnknown(p)),
    );
  }

  verbose(message: unknown, ...optionalParams: unknown[]): void {
    this.sink.verbose(
      redactUnknown(message) as never,
      ...optionalParams.map((p) => redactUnknown(p)),
    );
  }

  fatal(message: unknown, ...optionalParams: unknown[]): void {
    this.sink.fatal(
      redactUnknown(message) as never,
      ...optionalParams.map((p) => redactUnknown(p)),
    );
  }

  setLogLevels(levels: LogLevel[]): void {
    this.sink.setLogLevels(levels);
  }
}
