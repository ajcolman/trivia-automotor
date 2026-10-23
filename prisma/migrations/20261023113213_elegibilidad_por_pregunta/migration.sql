-- CreateTable
CREATE TABLE "MarketContender" (
    "marketId" TEXT NOT NULL,
    "contenderId" TEXT NOT NULL,

    CONSTRAINT "MarketContender_pkey" PRIMARY KEY ("marketId","contenderId")
);

-- CreateIndex
CREATE INDEX "MarketContender_contenderId_idx" ON "MarketContender"("contenderId");

-- AddForeignKey
ALTER TABLE "MarketContender" ADD CONSTRAINT "MarketContender_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "Market"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketContender" ADD CONSTRAINT "MarketContender_contenderId_fkey" FOREIGN KEY ("contenderId") REFERENCES "Contender"("id") ON DELETE CASCADE ON UPDATE CASCADE;
