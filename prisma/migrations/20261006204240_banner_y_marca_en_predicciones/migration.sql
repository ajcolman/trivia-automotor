-- AlterTable
ALTER TABLE "PredictionEvent" ADD COLUMN     "heroImageSettings" JSONB;

-- CreateIndex
CREATE INDEX "PredictionEvent_brandId_idx" ON "PredictionEvent"("brandId");

-- AddForeignKey
ALTER TABLE "PredictionEvent" ADD CONSTRAINT "PredictionEvent_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE SET NULL ON UPDATE CASCADE;
