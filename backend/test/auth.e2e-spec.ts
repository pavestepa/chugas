import { UnprocessableEntityException, ValidationPipe } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from '@nestjs/platform-fastify';

import { AppModule } from '../src/app.module';

describe('Auth (e2e)', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidUnknownValues: false,
        exceptionFactory: (errors) => {
          const firstError = errors[0];
          const message =
            firstError?.constraints !== undefined
              ? Object.values(firstError.constraints)[0]
              : 'Validation failed';
          return new UnprocessableEntityException({ error: message });
        },
      }),
    );
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /auth/register creates user without tokens', async () => {
    const email = `test-${String(Date.now())}@example.com`;
    const response = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: {
        email,
        username: `user_${String(Date.now())}`,
        password: 'password123',
      },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({
      user: {
        email,
        _id: expect.any(String),
      },
    });
  });

  it('POST /auth/login returns tokens', async () => {
    const email = `login-${String(Date.now())}@example.com`;
    const password = 'password123';
    const username = `login_${String(Date.now())}`;

    await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { email, username, password },
    });

    const response = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { identifier: email, password },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      user: { _id: expect.any(String) },
      accessToken: expect.any(String),
      refreshToken: expect.any(String),
    });
  });
});
