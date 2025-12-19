-- AlterTable
ALTER TABLE "Apartment" ADD COLUMN     "floorPlanId" INTEGER,
ADD COLUMN     "maxRent" DOUBLE PRECISION,
ADD COLUMN     "minRent" DOUBLE PRECISION,
ADD COLUMN     "property" TEXT;

-- CreateTable
CREATE TABLE "FloorPlan" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "bedrooms" INTEGER NOT NULL,
    "bathrooms" DOUBLE PRECISION NOT NULL,
    "marketRent" DOUBLE PRECISION NOT NULL,
    "requiredDeposit" DOUBLE PRECISION NOT NULL,
    "sqFt" INTEGER NOT NULL,
    "maxOccupancy" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FloorPlan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FloorPlan_name_key" ON "FloorPlan"("name");

-- CreateIndex
CREATE INDEX "Apartment_floorPlanId_idx" ON "Apartment"("floorPlanId");

-- AddForeignKey
ALTER TABLE "Apartment" ADD CONSTRAINT "Apartment_floorPlanId_fkey" FOREIGN KEY ("floorPlanId") REFERENCES "FloorPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
