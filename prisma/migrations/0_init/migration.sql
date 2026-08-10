-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('super_admin', 'admin');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE');

-- CreateEnum
CREATE TYPE "FieldType" AS ENUM ('text', 'email', 'phone', 'select', 'number', 'brand_models');

-- CreateEnum
CREATE TYPE "TournamentStatus" AS ENUM ('pending', 'active', 'finished');

-- CreateEnum
CREATE TYPE "MatchStatus" AS ENUM ('waiting', 'playing', 'finished');

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logoUrl" TEXT,
    "description" TEXT,
    "website" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Brand" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "logoUrl" TEXT,
    "models" JSONB NOT NULL DEFAULT '[]',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Brand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'admin',
    "companyId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Trivia" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "slug" TEXT NOT NULL,
    "logoUrl" TEXT,
    "companyId" TEXT,
    "primaryColor" TEXT NOT NULL DEFAULT '#003087',
    "secondaryColor" TEXT NOT NULL DEFAULT '#002060',
    "accentColor" TEXT NOT NULL DEFAULT '#FFD700',
    "backgroundColor" TEXT NOT NULL DEFAULT '#F8FAFC',
    "textColor" TEXT NOT NULL DEFAULT '#1A1A2E',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "showLeaderboard" BOOLEAN NOT NULL DEFAULT true,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "maxPlaysPerUser" INTEGER NOT NULL DEFAULT 1,
    "gameInstructions" TEXT,
    "termsAndConditions" TEXT,
    "heroImageUrl" TEXT,
    "heroImageSettings" JSONB,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Trivia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Question" (
    "id" TEXT NOT NULL,
    "triviaId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "options" JSONB NOT NULL,
    "correctAnswer" INTEGER NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 100,
    "timeLimit" INTEGER NOT NULL DEFAULT 30,
    "orderIndex" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FormField" (
    "id" TEXT NOT NULL,
    "triviaId" TEXT NOT NULL,
    "fieldName" TEXT NOT NULL,
    "fieldLabel" TEXT NOT NULL,
    "fieldType" "FieldType" NOT NULL DEFAULT 'text',
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "options" JSONB,
    "placeholder" TEXT,
    "orderIndex" INTEGER NOT NULL,

    CONSTRAINT "FormField_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "triviaId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "formData" JSONB NOT NULL,
    "score" INTEGER NOT NULL,
    "maxScore" INTEGER NOT NULL,
    "answers" JSONB NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameSession" (
    "id" TEXT NOT NULL,
    "triviaId" TEXT NOT NULL,
    "sessionIdentifier" TEXT NOT NULL,
    "playCount" INTEGER NOT NULL DEFAULT 0,
    "hasCompleted" BOOLEAN NOT NULL DEFAULT false,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "GameSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Asset" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "uploadedBy" TEXT NOT NULL,
    "companyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Prize" (
    "id" TEXT NOT NULL,
    "triviaId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "position" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Prize_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TriviaFlyer" (
    "id" TEXT NOT NULL,
    "triviaId" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TriviaFlyer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PageView" (
    "id" TEXT NOT NULL,
    "triviaId" TEXT,
    "path" TEXT NOT NULL,
    "sessionId" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "referrer" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PageView_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TriviaTemplate" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "logoUrl" TEXT,
    "primaryColor" TEXT NOT NULL DEFAULT '#003087',
    "secondaryColor" TEXT NOT NULL DEFAULT '#002060',
    "accentColor" TEXT NOT NULL DEFAULT '#FFD700',
    "backgroundColor" TEXT NOT NULL DEFAULT '#F8FAFC',
    "textColor" TEXT NOT NULL DEFAULT '#1A1A2E',
    "questions" JSONB NOT NULL,
    "formFields" JSONB NOT NULL,
    "ownerId" TEXT NOT NULL,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TriviaTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TemplateShare" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "sharedWithId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TemplateShare_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleSprite" (
    "id" TEXT NOT NULL,
    "brandId" TEXT,
    "modelName" TEXT,
    "spriteUrl" TEXT NOT NULL,
    "isGeneric" BOOLEAN NOT NULL DEFAULT false,
    "genericType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VehicleSprite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tournament" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "triviaId" TEXT,
    "status" "TournamentStatus" NOT NULL DEFAULT 'pending',
    "maxPlayers" INTEGER NOT NULL DEFAULT 16,
    "prizeConfig" JSONB NOT NULL DEFAULT '{}',
    "gameConfig" JSONB NOT NULL DEFAULT '{}',
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tournament_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TournamentParticipant" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "cedula" TEXT NOT NULL,
    "playerName" TEXT NOT NULL,
    "vehicleId" TEXT,
    "seed" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TournamentParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TournamentMatch" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "player1Id" TEXT NOT NULL,
    "player2Id" TEXT NOT NULL,
    "round" INTEGER NOT NULL DEFAULT 1,
    "scoreP1" INTEGER NOT NULL DEFAULT 0,
    "scoreP2" INTEGER NOT NULL DEFAULT 0,
    "status" "MatchStatus" NOT NULL DEFAULT 'waiting',
    "roomCode" TEXT NOT NULL,
    "winnerId" TEXT,
    "scheduledAt" TIMESTAMP(3),
    "roomEnabledAt" TIMESTAMP(3),
    "playedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TournamentMatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "entityName" TEXT,
    "action" "AuditAction" NOT NULL,
    "userId" TEXT NOT NULL,
    "userName" TEXT NOT NULL,
    "userEmail" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformSettings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "platformTerms" TEXT,
    "privacyPolicy" TEXT,
    "heroImageUrl" TEXT,
    "heroImageSettings" JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_BrandToTrivia" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Company_name_key" ON "Company"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Company_slug_key" ON "Company"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Brand_companyId_name_key" ON "Brand"("companyId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Trivia_slug_key" ON "Trivia"("slug");

-- CreateIndex
CREATE INDEX "Question_triviaId_orderIndex_idx" ON "Question"("triviaId", "orderIndex");

-- CreateIndex
CREATE INDEX "FormField_triviaId_idx" ON "FormField"("triviaId");

-- CreateIndex
CREATE INDEX "Lead_triviaId_completedAt_idx" ON "Lead"("triviaId", "completedAt");

-- CreateIndex
CREATE INDEX "GameSession_sessionIdentifier_idx" ON "GameSession"("sessionIdentifier");

-- CreateIndex
CREATE UNIQUE INDEX "GameSession_triviaId_sessionIdentifier_key" ON "GameSession"("triviaId", "sessionIdentifier");

-- CreateIndex
CREATE INDEX "Prize_triviaId_idx" ON "Prize"("triviaId");

-- CreateIndex
CREATE INDEX "TriviaFlyer_triviaId_idx" ON "TriviaFlyer"("triviaId");

-- CreateIndex
CREATE INDEX "PageView_triviaId_createdAt_idx" ON "PageView"("triviaId", "createdAt");

-- CreateIndex
CREATE INDEX "PageView_path_createdAt_idx" ON "PageView"("path", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "TemplateShare_templateId_sharedWithId_key" ON "TemplateShare"("templateId", "sharedWithId");

-- CreateIndex
CREATE INDEX "VehicleSprite_brandId_idx" ON "VehicleSprite"("brandId");

-- CreateIndex
CREATE INDEX "Tournament_status_idx" ON "Tournament"("status");

-- CreateIndex
CREATE INDEX "TournamentParticipant_tournamentId_idx" ON "TournamentParticipant"("tournamentId");

-- CreateIndex
CREATE UNIQUE INDEX "TournamentParticipant_tournamentId_cedula_key" ON "TournamentParticipant"("tournamentId", "cedula");

-- CreateIndex
CREATE UNIQUE INDEX "TournamentMatch_roomCode_key" ON "TournamentMatch"("roomCode");

-- CreateIndex
CREATE INDEX "TournamentMatch_tournamentId_round_idx" ON "TournamentMatch"("tournamentId", "round");

-- CreateIndex
CREATE INDEX "TournamentMatch_roomCode_idx" ON "TournamentMatch"("roomCode");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_userId_createdAt_idx" ON "AuditLog"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "_BrandToTrivia_AB_unique" ON "_BrandToTrivia"("A", "B");

-- CreateIndex
CREATE INDEX "_BrandToTrivia_B_index" ON "_BrandToTrivia"("B");

-- AddForeignKey
ALTER TABLE "Brand" ADD CONSTRAINT "Brand_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trivia" ADD CONSTRAINT "Trivia_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trivia" ADD CONSTRAINT "Trivia_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_triviaId_fkey" FOREIGN KEY ("triviaId") REFERENCES "Trivia"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormField" ADD CONSTRAINT "FormField_triviaId_fkey" FOREIGN KEY ("triviaId") REFERENCES "Trivia"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_triviaId_fkey" FOREIGN KEY ("triviaId") REFERENCES "Trivia"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameSession" ADD CONSTRAINT "GameSession_triviaId_fkey" FOREIGN KEY ("triviaId") REFERENCES "Trivia"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prize" ADD CONSTRAINT "Prize_triviaId_fkey" FOREIGN KEY ("triviaId") REFERENCES "Trivia"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TriviaFlyer" ADD CONSTRAINT "TriviaFlyer_triviaId_fkey" FOREIGN KEY ("triviaId") REFERENCES "Trivia"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PageView" ADD CONSTRAINT "PageView_triviaId_fkey" FOREIGN KEY ("triviaId") REFERENCES "Trivia"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TriviaTemplate" ADD CONSTRAINT "TriviaTemplate_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemplateShare" ADD CONSTRAINT "TemplateShare_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "TriviaTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemplateShare" ADD CONSTRAINT "TemplateShare_sharedWithId_fkey" FOREIGN KEY ("sharedWithId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleSprite" ADD CONSTRAINT "VehicleSprite_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tournament" ADD CONSTRAINT "Tournament_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tournament" ADD CONSTRAINT "Tournament_triviaId_fkey" FOREIGN KEY ("triviaId") REFERENCES "Trivia"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentParticipant" ADD CONSTRAINT "TournamentParticipant_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentParticipant" ADD CONSTRAINT "TournamentParticipant_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "VehicleSprite"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentMatch" ADD CONSTRAINT "TournamentMatch_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentMatch" ADD CONSTRAINT "TournamentMatch_player1Id_fkey" FOREIGN KEY ("player1Id") REFERENCES "TournamentParticipant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentMatch" ADD CONSTRAINT "TournamentMatch_player2Id_fkey" FOREIGN KEY ("player2Id") REFERENCES "TournamentParticipant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_BrandToTrivia" ADD CONSTRAINT "_BrandToTrivia_A_fkey" FOREIGN KEY ("A") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_BrandToTrivia" ADD CONSTRAINT "_BrandToTrivia_B_fkey" FOREIGN KEY ("B") REFERENCES "Trivia"("id") ON DELETE CASCADE ON UPDATE CASCADE;

