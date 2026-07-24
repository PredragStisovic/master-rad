import { HttpException, HttpStatus } from '@nestjs/common';
import { AllExceptionsFilter } from './http-exception.filter';

const mockResponse = () => {
  const res: { statusCode?: number; body?: unknown; status: jest.Mock; json: jest.Mock } = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  res.status = jest.fn().mockImplementation((code: number) => {
    res.statusCode = code;
    return res;
  });
  res.json = jest.fn().mockImplementation((body: unknown) => {
    res.body = body;
    return res;
  });
  return res;
};

const mockHost = (res: object) => ({
  switchToHttp: () => ({
    getResponse: () => res,
    getRequest: () => ({ url: '/test' }),
  }),
});

describe('AllExceptionsFilter', () => {
  let filter: AllExceptionsFilter;

  beforeEach(() => {
    filter = new AllExceptionsFilter();
  });

  it('handles HttpException with object message', () => {
    const res = mockResponse();
    const exception = new HttpException(
      { message: 'Not found' },
      HttpStatus.NOT_FOUND,
    );

    filter.catch(exception, mockHost(res) as never);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 404, message: 'Not found' }),
    );
  });

  it('handles HttpException with string message', () => {
    const res = mockResponse();
    const exception = new HttpException('Bad request', HttpStatus.BAD_REQUEST);

    filter.catch(exception, mockHost(res) as never);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 400, message: 'Bad request' }),
    );
  });

  it('handles unknown exceptions as 500', () => {
    const res = mockResponse();

    filter.catch(new Error('Boom'), mockHost(res) as never);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 500 }),
    );
  });
});
