import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';

@Catch()
export class GlobalHttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalHttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] =
      'Une erreur technique est survenue. Réessayez dans un instant.';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === 'string') {
        message = body;
      } else if (body && typeof body === 'object' && 'message' in body) {
        message = (body as { message: string | string[] }).message;
      }
    } else if (exception instanceof Error) {
      this.logger.error(exception.message, exception.stack);
    } else {
      this.logger.error('Erreur inconnue', String(exception));
    }

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      const text = Array.isArray(message)
        ? message.join(' ')
        : String(message ?? '');
      const technical =
        !text.trim() ||
        /internal server error/i.test(text) ||
        /^error$/i.test(text.trim());
      if (technical) {
        message =
          'Le service rencontre un problème temporaire. Réessayez dans quelques instants.';
      }
    }

    response.status(status).json({
      statusCode: status,
      message,
    });
  }
}
