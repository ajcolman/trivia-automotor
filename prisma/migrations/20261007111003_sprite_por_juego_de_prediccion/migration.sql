-- AlterTable
ALTER TABLE "PredictionEvent" ADD COLUMN     "vehicleSpriteId" TEXT;

-- AddForeignKey
ALTER TABLE "PredictionEvent" ADD CONSTRAINT "PredictionEvent_vehicleSpriteId_fkey" FOREIGN KEY ("vehicleSpriteId") REFERENCES "VehicleSprite"("id") ON DELETE SET NULL ON UPDATE CASCADE;
