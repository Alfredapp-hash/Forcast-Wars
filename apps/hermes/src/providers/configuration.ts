import { registerAs } from '@nestjs/config';

type HermesConfig = {
  HOST: string;
  PORT: number;
  NATS_URL: string;
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  REDIS_URL?: string;
};

const configuration = registerAs('hermes', (): HermesConfig => ({
  HOST: process.env.HERMES_HOST ?? '0.0.0.0',
  PORT: Number(process.env.HERMES_PORT ?? 4000),
  NATS_URL: process.env.NATS_URL ?? 'nats://127.0.0.1:4222',
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY,
  REDIS_URL: process.env.REDIS_URL,
}));

export default configuration;
export type { HermesConfig };
