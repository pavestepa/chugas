export type AppEnv = 'development' | 'test' | 'production';

const appEnv = (process.env.EXPO_PUBLIC_APP_ENV ?? 'development') as AppEnv;

export const env = {
  appEnv,
  apiUrl: process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000',
  wsUrl: process.env.EXPO_PUBLIC_WS_URL ?? 'ws://localhost:3000',
} as const;
