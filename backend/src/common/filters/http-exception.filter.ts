import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { FastifyReply } from 'fastify';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<FastifyReply>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'object') {
        response.status(status).send(exceptionResponse);
        return;
      }

      response.status(status).send({ error: exceptionResponse });
      return;
    }

    if (
      exception instanceof Prisma.PrismaClientKnownRequestError &&
      exception.code === 'P2002'
    ) {
      response.status(HttpStatus.CONFLICT).send({ error: 'Resource already exists' });
      return;
    }

    if (
      exception instanceof Prisma.PrismaClientKnownRequestError &&
      exception.code === 'P2023'
    ) {
      response.status(HttpStatus.BAD_REQUEST).send({ error: 'Invalid id' });
      return;
    }

    response
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .send({ error: 'Internal server error' });
  }
}
