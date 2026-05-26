-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'GESTOR', 'REPRESENTANTE');

-- CreateEnum
CREATE TYPE "Classification" AS ENUM ('A', 'B', 'C');

-- CreateEnum
CREATE TYPE "VisitStatus" AS ENUM ('SYNCED', 'PENDING_REVIEW', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "StrategyType" AS ENUM ('EQUIPMENT_OFFER', 'PRICE_DIFFERENTIATION', 'BONIFICATION', 'PRODUCT_DEMO', 'RELATIONSHIP_FOLLOWUP', 'INSTITUTIONAL_PITCH');

-- CreateEnum
CREATE TYPE "StrategyStatus" AS ENUM ('PROPOSED', 'IN_PROGRESS', 'WON', 'LOST', 'POSTPONED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "refreshTokenHash" TEXT,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "fantasyName" TEXT NOT NULL,
    "socialReason" TEXT,
    "cnpj" TEXT,
    "phone" TEXT,
    "whatsapp" TEXT,
    "addressLine" TEXT NOT NULL,
    "city" TEXT,
    "state" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "worksWithFrozen" BOOLEAN NOT NULL DEFAULT false,
    "currentSupplier" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Visit" (
    "id" TEXT NOT NULL,
    "clientId" TEXT,
    "representativeId" TEXT NOT NULL,
    "fantasyName" TEXT NOT NULL,
    "phone" TEXT,
    "addressLine" TEXT NOT NULL,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "facadePhotoKey" TEXT,
    "worksWithFrozen" BOOLEAN NOT NULL,
    "currentSupplier" TEXT,
    "dailyVolume" DOUBLE PRECISION,
    "currentPrice" DOUBLE PRECISION,
    "equipmentLent" TEXT[],
    "observations" TEXT,
    "viabilityScore" INTEGER NOT NULL,
    "classification" "Classification" NOT NULL,
    "status" "VisitStatus" NOT NULL DEFAULT 'SYNCED',
    "clientUuid" TEXT NOT NULL,
    "visitedAt" TIMESTAMP(3) NOT NULL,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Visit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Strategy" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "visitId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" "StrategyType" NOT NULL,
    "status" "StrategyStatus" NOT NULL DEFAULT 'PROPOSED',
    "followUpAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "generatedByAi" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Strategy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT,
    "entityId" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_active_idx" ON "User"("active");

-- CreateIndex
CREATE INDEX "Client_lat_lng_idx" ON "Client"("lat", "lng");

-- CreateIndex
CREATE INDEX "Client_fantasyName_idx" ON "Client"("fantasyName");

-- CreateIndex
CREATE UNIQUE INDEX "Visit_clientUuid_key" ON "Visit"("clientUuid");

-- CreateIndex
CREATE INDEX "Visit_visitedAt_idx" ON "Visit"("visitedAt");

-- CreateIndex
CREATE INDEX "Visit_representativeId_idx" ON "Visit"("representativeId");

-- CreateIndex
CREATE INDEX "Visit_classification_idx" ON "Visit"("classification");

-- CreateIndex
CREATE INDEX "Visit_clientId_idx" ON "Visit"("clientId");

-- CreateIndex
CREATE INDEX "Strategy_status_followUpAt_idx" ON "Strategy"("status", "followUpAt");

-- CreateIndex
CREATE INDEX "Strategy_clientId_idx" ON "Strategy"("clientId");

-- CreateIndex
CREATE INDEX "Strategy_createdById_idx" ON "Strategy"("createdById");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_userId_action_idx" ON "AuditLog"("userId", "action");

-- AddForeignKey
ALTER TABLE "Visit" ADD CONSTRAINT "Visit_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Visit" ADD CONSTRAINT "Visit_representativeId_fkey" FOREIGN KEY ("representativeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Strategy" ADD CONSTRAINT "Strategy_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Strategy" ADD CONSTRAINT "Strategy_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "Visit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Strategy" ADD CONSTRAINT "Strategy_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
