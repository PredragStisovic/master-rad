import { ExecutionContext } from '@nestjs/common';
import { of } from 'rxjs';
import { LoggingInterceptor } from './logging.interceptor';

const mockContext = (): ExecutionContext =>
  ({
    switchToHttp: () => ({
      getRequest: () => ({ method: 'GET', url: '/test' }),
    }),
  }) as unknown as ExecutionContext;

describe('LoggingInterceptor', () => {
  it('passes the response through', (done) => {
    const interceptor = new LoggingInterceptor();
    const next = { handle: () => of({ data: 'ok' }) };

    interceptor.intercept(mockContext(), next).subscribe((result) => {
      expect(result).toEqual({ data: 'ok' });
      done();
    });
  });
});
