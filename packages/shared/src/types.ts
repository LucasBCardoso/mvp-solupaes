import type {
  Classification,
  Role,
  StrategyStatus,
  StrategyType,
  VisitStatus,
} from './constants.js';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  active: boolean;
  createdAt: string;
  lastLoginAt: string | null;
}

export interface Client {
  id: string;
  fantasyName: string;
  socialReason: string | null;
  cnpj: string | null;
  phone: string | null;
  whatsapp: string | null;
  addressLine: string;
  city: string | null;
  state: string | null;
  lat: number | null;
  lng: number | null;
  worksWithFrozen: boolean;
  currentSupplier: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Visit {
  id: string;
  clientId: string | null;
  representativeId: string;
  representativeName: string;
  fantasyName: string;
  phone: string | null;
  addressLine: string;
  lat: number | null;
  lng: number | null;
  facadePhotoUrl: string | null;
  worksWithFrozen: boolean;
  currentSupplier: string | null;
  dailyVolume: number | null;
  currentPrice: number | null;
  equipmentLent: string[];
  observations: string | null;
  viabilityScore: number;
  classification: Classification;
  status: VisitStatus;
  clientUuid: string;
  visitedAt: string;
  syncedAt: string;
}

export interface Strategy {
  id: string;
  clientId: string;
  clientFantasyName?: string;
  visitId: string | null;
  title: string;
  description: string;
  type: StrategyType;
  status: StrategyStatus;
  followUpAt: string | null;
  createdById: string;
  createdByName?: string;
  generatedByAi: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardSummary {
  totalVisits: number;
  visitsThisWeek: number;
  weekDelta: number;
  classA: number;
  classB: number;
  classC: number;
  avgScore: number;
  pendingStrategies: number;
  topOpportunities: Visit[];
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
  };
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface CreateVisitRequest {
  clientUuid: string;
  fantasyName: string;
  socialReason?: string;
  phone?: string;
  addressLine: string;
  lat?: number;
  lng?: number;
  facadePhotoKey?: string;
  worksWithFrozen: boolean;
  currentSupplier?: string;
  dailyVolume?: number;
  currentPrice?: number;
  equipmentLent?: string[];
  observations?: string;
  visitedAt: string;
}
