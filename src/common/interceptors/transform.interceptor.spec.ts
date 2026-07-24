import { ExecutionContext } from '@nestjs/common';
import { of } from 'rxjs';
import { TransformInterceptor } from './transform.interceptor';

const mockContext = (): ExecutionContext =>
  ({
    switchToHttp: () => ({
      getResponse: () => ({ statusCode: 200 }),
    }),
  }) as unknown as ExecutionContext;

describe('TransformInterceptor', () => {
  it('wraps response in ApiResponse envelope', (done) => {
    const interceptor = new TransformInterceptor();
    const next = { handle: () => of({ id: 1 }) };

    interceptor.intercept(mockContext(), next).subscribe((result) => {
      expect(result).toMatchObject({
        data: { id: 1 },
        statusCode: 200,
        timestamp: expect.any(String),
      });
      done();
    });
  });
});
