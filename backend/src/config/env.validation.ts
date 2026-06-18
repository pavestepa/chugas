import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().default(3000),
  DATABASE_URL: Joi.string().required(),
  REDIS_URL: Joi.string().required(),
  JWT_SECRET: Joi.string().required(),
  JWT_EXPIRES_IN: Joi.string().default('15m'),
  REFRESH_EXPIRES_IN_SECONDS: Joi.number().default(604800),
  LOCATION_SYNC_DELAY_MS: Joi.number().default(45000),
  AUTH_SESSION_EXPIRES_IN_SECONDS: Joi.number().default(600),
  API_URL: Joi.string().uri().default('http://localhost:3000'),
  PASSWORD_RESET_URL: Joi.string().uri(),
  SMTP_HOST: Joi.string().default('localhost'),
  SMTP_PORT: Joi.number().default(1025),
  SMTP_SECURE: Joi.boolean().default(false),
  SMTP_USER: Joi.string().allow('').default(''),
  SMTP_PASS: Joi.string().allow('').default(''),
  SMTP_FROM: Joi.string().default('chugas <no-reply@chugas.local>'),
});
