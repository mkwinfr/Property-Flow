-- CreateEnum
CREATE TYPE "MoveoutInspectionType" AS ENUM ('PRE_MOVEOUT', 'FINAL', 'OTHER');

-- CreateEnum
CREATE TYPE "MoveoutInspectionStatus" AS ENUM ('DRAFT', 'COMPLETED', 'LOCKED');

-- CreateEnum
CREATE TYPE "MoveoutConditionStatus" AS ENUM ('OK', 'WEAR', 'DAMAGE', 'MISSING', 'NOT_INSPECTED');

-- CreateEnum
CREATE TYPE "MoveoutResponsibility" AS ENUM ('OWNER', 'TENANT', 'UNSURE');

-- CreateEnum
CREATE TYPE "MoveoutChargeStatus" AS ENUM ('PROPOSED', 'APPROVED', 'REMOVED');

-- CreateEnum
CREATE TYPE "MoveoutMediaType" AS ENUM ('PHOTO', 'VIDEO', 'OTHER');

-- CreateTable
CREATE TABLE "MoveoutInspection" (
    "id" SERIAL NOT NULL,
    "propertyId" INTEGER NOT NULL,
    "unitId" INTEGER,
    "apartmentId" INTEGER,
    "inspectionType" "MoveoutInspectionType" NOT NULL DEFAULT 'FINAL',
    "status" "MoveoutInspectionStatus" NOT NULL DEFAULT 'DRAFT',
    "inspectorUserId" INTEGER,
    "inspectionDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MoveoutInspection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MoveoutInspectionItem" (
    "id" SERIAL NOT NULL,
    "inspectionId" INTEGER NOT NULL,
    "templateKey" TEXT,
    "roomKey" TEXT NOT NULL,
    "categoryKey" TEXT NOT NULL,
    "itemKey" TEXT NOT NULL,
    "itemLabel" TEXT NOT NULL,
    "conditionStatus" "MoveoutConditionStatus" NOT NULL DEFAULT 'NOT_INSPECTED',
    "responsibility" "MoveoutResponsibility" NOT NULL DEFAULT 'UNSURE',
    "notes" TEXT,
    "costEstimate" DOUBLE PRECISION,
    "severity" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MoveoutInspectionItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MoveoutInspectionMedia" (
    "id" SERIAL NOT NULL,
    "itemId" INTEGER NOT NULL,
    "inspectionId" INTEGER,
    "mediaType" "MoveoutMediaType" NOT NULL DEFAULT 'PHOTO',
    "uri" TEXT NOT NULL,
    "caption" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MoveoutInspectionMedia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MoveoutChargeLineItem" (
    "id" SERIAL NOT NULL,
    "inspectionId" INTEGER NOT NULL,
    "itemId" INTEGER,
    "description" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "status" "MoveoutChargeStatus" NOT NULL DEFAULT 'PROPOSED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MoveoutChargeLineItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MoveoutInspection_propertyId_idx" ON "MoveoutInspection"("propertyId");

-- CreateIndex
CREATE INDEX "MoveoutInspection_apartmentId_idx" ON "MoveoutInspection"("apartmentId");

-- CreateIndex
CREATE INDEX "MoveoutInspection_status_idx" ON "MoveoutInspection"("status");

-- CreateIndex
CREATE INDEX "MoveoutInspection_inspectionDate_idx" ON "MoveoutInspection"("inspectionDate");

-- CreateIndex
CREATE INDEX "MoveoutInspectionItem_inspectionId_idx" ON "MoveoutInspectionItem"("inspectionId");

-- CreateIndex
CREATE INDEX "MoveoutInspectionItem_conditionStatus_idx" ON "MoveoutInspectionItem"("conditionStatus");

-- CreateIndex
CREATE UNIQUE INDEX "MoveoutInspectionItem_inspectionId_templateKey_key" ON "MoveoutInspectionItem"("inspectionId", "templateKey");

-- CreateIndex
CREATE INDEX "MoveoutInspectionMedia_itemId_idx" ON "MoveoutInspectionMedia"("itemId");

-- CreateIndex
CREATE INDEX "MoveoutChargeLineItem_inspectionId_idx" ON "MoveoutChargeLineItem"("inspectionId");

-- CreateIndex
CREATE INDEX "MoveoutChargeLineItem_itemId_idx" ON "MoveoutChargeLineItem"("itemId");

-- CreateIndex
CREATE INDEX "MoveoutChargeLineItem_status_idx" ON "MoveoutChargeLineItem"("status");

-- AddForeignKey
ALTER TABLE "MoveoutInspectionItem" ADD CONSTRAINT "MoveoutInspectionItem_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "MoveoutInspection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MoveoutInspectionMedia" ADD CONSTRAINT "MoveoutInspectionMedia_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "MoveoutInspectionItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MoveoutInspectionMedia" ADD CONSTRAINT "MoveoutInspectionMedia_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "MoveoutInspection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MoveoutChargeLineItem" ADD CONSTRAINT "MoveoutChargeLineItem_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "MoveoutInspection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MoveoutChargeLineItem" ADD CONSTRAINT "MoveoutChargeLineItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "MoveoutInspectionItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
