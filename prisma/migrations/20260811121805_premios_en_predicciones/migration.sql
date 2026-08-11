-- AlterTable
ALTER TABLE "Prize" ADD COLUMN     "predictionEventId" TEXT,
ALTER COLUMN "triviaId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "Prize_predictionEventId_idx" ON "Prize"("predictionEventId");

-- AddForeignKey
ALTER TABLE "Prize" ADD CONSTRAINT "Prize_predictionEventId_fkey" FOREIGN KEY ("predictionEventId") REFERENCES "PredictionEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
