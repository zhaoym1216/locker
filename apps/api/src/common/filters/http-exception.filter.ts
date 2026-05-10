import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Response } from 'express';

const STATUS_MESSAGES: Record<number, string> = {
  [HttpStatus.BAD_REQUEST]: '请求参数错误',
  [HttpStatus.UNAUTHORIZED]: '未登录或登录已过期',
  [HttpStatus.FORBIDDEN]: '没有权限执行此操作',
  [HttpStatus.NOT_FOUND]: '请求的资源不存在',
  [HttpStatus.CONFLICT]: '数据冲突',
  [HttpStatus.UNPROCESSABLE_ENTITY]: '请求数据格式错误',
  [HttpStatus.TOO_MANY_REQUESTS]: '请求过于频繁，请稍后再试',
  [HttpStatus.INTERNAL_SERVER_ERROR]: '服务器内部错误',
};

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    let message: string;

    if (typeof exceptionResponse === 'string') {
      message = exceptionResponse;
    } else if (typeof exceptionResponse === 'object') {
      const res = exceptionResponse as any;
      if (Array.isArray(res.message)) {
        message = res.message.join('；');
      } else {
        message = res.message || STATUS_MESSAGES[status] || '未知错误';
      }
    } else {
      message = STATUS_MESSAGES[status] || '未知错误';
    }

    response.status(status).json({
      code: status,
      message,
      timestamp: new Date().toISOString(),
    });
  }
}
