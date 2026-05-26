import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

  DATABASE_URL: z.string().url(),

  JWT_SECRET: z.string().min(32, 'JWT_SECRET precisa ter ao menos 32 caracteres'),
  JWT_ACCESS_TTL: z.string().default('15m'),
  REFRESH_SECRET: z.string().min(32, 'REFRESH_SECRET precisa ter ao menos 32 caracteres'),
  JWT_REFRESH_TTL: z.string().default('7d'),

  CORS_ORIGINS: z.string().default('http://localhost:5173'),

  R2_ENDPOINT: z
    .union([z.string().url(), z.literal('')])
    .optional()
    .transform((v) => (v ? v : undefined)),
  R2_ACCESS_KEY_ID: z.string().optional().transform((v) => (v ? v : undefined)),
  R2_SECRET_ACCESS_KEY: z.string().optional().transform((v) => (v ? v : undefined)),
  R2_BUCKET: z.string().optional().transform((v) => (v ? v : undefined)),
  R2_PUBLIC_URL: z
    .union([z.string().url(), z.literal('')])
    .optional()
    .transform((v) => (v ? v : undefined)),

  ENABLE_AI_STRATEGY: z
    .union([z.literal('true'), z.literal('false')])
    .default('false')
    .transform((v) => v === 'true'),
  GEMINI_API_KEY: z.string().optional(),

  SENTRY_DSN: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error(' Configuração de ambiente inválida:');
  // eslint-disable-next-line no-console
  console.error(JSON.stringify(parsed.error.format(), null, 2));
  process.exit(1);
}

export const env = parsed.data;

export const corsOrigins = env.CORS_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean);

export const isStorageConfigured =
  !!env.R2_ENDPOINT && !!env.R2_ACCESS_KEY_ID && !!env.R2_SECRET_ACCESS_KEY && !!env.R2_BUCKET;
