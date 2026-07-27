/**
 * Logging abstraction so callers depend on ILogger, not a concrete implementation.
 * TODO: replace ConsoleLogger with a structured logger (e.g. pino) if/when needed.
 */
export interface ILogger {
  debug(message: string, meta?: Record<string, unknown>): void;
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
}

class ConsoleLogger implements ILogger {
  debug(message: string, meta?: Record<string, unknown>): void {
    console.debug(message, meta ?? '');
  }

  info(message: string, meta?: Record<string, unknown>): void {
    console.info(message, meta ?? '');
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    console.warn(message, meta ?? '');
  }

  error(message: string, meta?: Record<string, unknown>): void {
    console.error(message, meta ?? '');
  }
}

export const logger: ILogger = new ConsoleLogger();
