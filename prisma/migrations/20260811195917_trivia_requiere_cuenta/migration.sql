-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "playerId" TEXT;

-- AlterTable
ALTER TABLE "Trivia" ADD COLUMN     "requiresAccount" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Lead_playerId_idx" ON "Lead"("playerId");

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;
