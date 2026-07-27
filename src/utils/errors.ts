/**
 * Base error hierarchy for the application.
 * TODO: add further domain-specific error subclasses as business logic is implemented.
 */
export class AppError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class McpCommunicationError extends AppError {
  constructor(message: string, cause?: unknown) {
    super(message, cause);
    this.name = 'McpCommunicationError';
  }
}

export class AgentError extends AppError {
  constructor(message: string, cause?: unknown) {
    super(message, cause);
    this.name = 'AgentError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string, cause?: unknown) {
    super(message, cause);
    this.name = 'ValidationError';
  }
}
