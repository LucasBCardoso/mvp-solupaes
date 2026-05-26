import { z } from 'zod';
import {
  CLASSIFICATIONS,
  ROLES,
  STRATEGY_STATUSES,
  STRATEGY_TYPES,
  VISIT_STATUSES,
} from './constants.js';

const cuid = z.string().min(1);
const isoDate = z.string().datetime();

const emailSchema = z.string().email().max(255).toLowerCase().trim();
const passwordSchema = z
  .string()
  .min(8, 'Senha precisa ter ao menos 8 caracteres')
  .max(128, 'Senha muito longa');

export const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(20),
});

export const createUserSchema = z.object({
  email: emailSchema,
  name: z.string().trim().min(2).max(120),
  password: passwordSchema,
  role: z.enum(ROLES),
});

export const updateUserSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  password: passwordSchema.optional(),
  role: z.enum(ROLES).optional(),
  active: z.boolean().optional(),
});

export const createClientSchema = z.object({
  fantasyName: z.string().trim().min(2).max(200),
  socialReason: z.string().trim().max(200).optional(),
  cnpj: z.string().trim().max(20).optional(),
  phone: z.string().trim().max(30).optional(),
  whatsapp: z.string().trim().max(30).optional(),
  addressLine: z.string().trim().min(3).max(300),
  city: z.string().trim().max(120).optional(),
  state: z.string().trim().max(2).optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  worksWithFrozen: z.boolean().default(false),
  currentSupplier: z.string().trim().max(200).optional(),
});

export const updateClientSchema = createClientSchema.partial();

const equipmentSchema = z.array(z.string().trim().min(1).max(80)).max(20);

export const createVisitSchema = z.object({
  clientUuid: z.string().uuid('clientUuid precisa ser UUID v4'),
  clientId: cuid.optional(),
  fantasyName: z.string().trim().min(2).max(200),
  socialReason: z.string().trim().max(200).optional(),
  phone: z.string().trim().max(30).optional(),
  addressLine: z.string().trim().min(3).max(300),
  lat: z.number().min(-90).max(90).nullable().optional(),
  lng: z.number().min(-180).max(180).nullable().optional(),
  facadePhotoKey: z.string().trim().max(255).optional(),
  worksWithFrozen: z.boolean(),
  currentSupplier: z.string().trim().max(200).optional(),
  dailyVolume: z.number().min(0).max(100000).optional(),
  currentPrice: z.number().min(0).max(10000).optional(),
  equipmentLent: equipmentSchema.optional(),
  observations: z.string().trim().max(2000).optional(),
  visitedAt: isoDate,
});

export const syncVisitsSchema = z.object({
  visits: z.array(createVisitSchema).min(1).max(50),
});

export const listVisitsQuerySchema = z.object({
  representativeId: cuid.optional(),
  classification: z.enum(CLASSIFICATIONS).optional(),
  status: z.enum(VISIT_STATUSES).optional(),
  fromDate: isoDate.optional(),
  toDate: isoDate.optional(),
  geoBox: z
    .string()
    .regex(/^-?\d+(\.\d+)?,-?\d+(\.\d+)?,-?\d+(\.\d+)?,-?\d+(\.\d+)?$/)
    .optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

export const createStrategySchema = z.object({
  clientId: cuid,
  visitId: cuid.optional(),
  title: z.string().trim().min(3).max(200),
  description: z.string().trim().min(3).max(2000),
  type: z.enum(STRATEGY_TYPES),
  followUpAt: isoDate.optional(),
});

export const updateStrategySchema = z.object({
  title: z.string().trim().min(3).max(200).optional(),
  description: z.string().trim().min(3).max(2000).optional(),
  status: z.enum(STRATEGY_STATUSES).optional(),
  followUpAt: isoDate.nullable().optional(),
});

export const uploadFacadeSchema = z.object({
  contentType: z
    .string()
    .regex(/^image\/(jpeg|png|webp)$/, 'Apenas image/jpeg, image/png ou image/webp'),
  size: z.number().int().positive().max(5 * 1024 * 1024, 'Máximo 5MB'),
  clientUuid: z.string().uuid(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type CreateClientInput = z.infer<typeof createClientSchema>;
export type UpdateClientInput = z.infer<typeof updateClientSchema>;
export type CreateVisitInput = z.infer<typeof createVisitSchema>;
export type SyncVisitsInput = z.infer<typeof syncVisitsSchema>;
export type ListVisitsQuery = z.infer<typeof listVisitsQuerySchema>;
export type CreateStrategyInput = z.infer<typeof createStrategySchema>;
export type UpdateStrategyInput = z.infer<typeof updateStrategySchema>;
export type UploadFacadeInput = z.infer<typeof uploadFacadeSchema>;
