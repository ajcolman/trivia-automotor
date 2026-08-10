-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('draft', 'open', 'live', 'closed', 'settled');

-- CreateEnum
CREATE TYPE "MarketType" AS ENUM ('single_pick', 'ordered_pick', 'multi_pick', 'numeric');

-- CreateEnum
CREATE TYPE "PlayerTokenType" AS ENUM ('email_verification', 'password_reset');

-- CreateTable
CREATE TABLE "Player" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "cedula" TEXT,
    "emailVerifiedAt" TIMESTAMP(3),
    "acceptedTermsAt" TIMESTAMP(3),
    "termsVersion" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Player_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayerToken" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "type" "PlayerTokenType" NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlayerToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PredictionEvent" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "EventStatus" NOT NULL DEFAULT 'draft',
    "externalRef" TEXT,
    "opensAt" TIMESTAMP(3),
    "closesAt" TIMESTAMP(3),
    "companyId" TEXT,
    "brandId" TEXT,
    "heroImageUrl" TEXT,
    "primaryColor" TEXT NOT NULL DEFAULT '#005CA8',
    "secondaryColor" TEXT NOT NULL DEFAULT '#004071',
    "rules" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PredictionEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Segment" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "distanceKm" DOUBLE PRECISION,
    "startsAt" TIMESTAMP(3),
    "locksAt" TIMESTAMP(3) NOT NULL,
    "isCancelled" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Segment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contender" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "externalRef" TEXT,
    "number" TEXT,
    "name" TEXT NOT NULL,
    "subtitle" TEXT,
    "teamName" TEXT,
    "category" TEXT,
    "imageUrl" TEXT,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Contender_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Market" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "segmentId" TEXT,
    "type" "MarketType" NOT NULL,
    "title" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "config" JSONB NOT NULL DEFAULT '{}',
    "locksAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Market_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Prediction" (
    "id" TEXT NOT NULL,
    "marketId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "pointsAwarded" INTEGER,
    "scoredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Prediction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Resolution" (
    "id" TEXT NOT NULL,
    "marketId" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "enteredBy" TEXT,
    "revisedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Resolution_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Player_email_key" ON "Player"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Player_cedula_key" ON "Player"("cedula");

-- CreateIndex
CREATE INDEX "Player_createdAt_idx" ON "Player"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerToken_tokenHash_key" ON "PlayerToken"("tokenHash");

-- CreateIndex
CREATE INDEX "PlayerToken_playerId_type_idx" ON "PlayerToken"("playerId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "PredictionEvent_slug_key" ON "PredictionEvent"("slug");

-- CreateIndex
CREATE INDEX "PredictionEvent_status_idx" ON "PredictionEvent"("status");

-- CreateIndex
CREATE INDEX "Segment_eventId_orderIndex_idx" ON "Segment"("eventId", "orderIndex");

-- CreateIndex
CREATE UNIQUE INDEX "Segment_eventId_code_key" ON "Segment"("eventId", "code");

-- CreateIndex
CREATE INDEX "Contender_eventId_orderIndex_idx" ON "Contender"("eventId", "orderIndex");

-- CreateIndex
CREATE UNIQUE INDEX "Contender_eventId_number_key" ON "Contender"("eventId", "number");

-- CreateIndex
CREATE INDEX "Market_eventId_locksAt_idx" ON "Market"("eventId", "locksAt");

-- CreateIndex
CREATE INDEX "Market_segmentId_idx" ON "Market"("segmentId");

-- CreateIndex
CREATE INDEX "Prediction_playerId_idx" ON "Prediction"("playerId");

-- CreateIndex
CREATE UNIQUE INDEX "Prediction_marketId_playerId_key" ON "Prediction"("marketId", "playerId");

-- CreateIndex
CREATE UNIQUE INDEX "Resolution_marketId_key" ON "Resolution"("marketId");

-- AddForeignKey
ALTER TABLE "PlayerToken" ADD CONSTRAINT "PlayerToken_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Segment" ADD CONSTRAINT "Segment_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "PredictionEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contender" ADD CONSTRAINT "Contender_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "PredictionEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Market" ADD CONSTRAINT "Market_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "PredictionEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Market" ADD CONSTRAINT "Market_segmentId_fkey" FOREIGN KEY ("segmentId") REFERENCES "Segment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prediction" ADD CONSTRAINT "Prediction_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "Market"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prediction" ADD CONSTRAINT "Prediction_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Resolution" ADD CONSTRAINT "Resolution_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "Market"("id") ON DELETE CASCADE ON UPDATE CASCADE;
