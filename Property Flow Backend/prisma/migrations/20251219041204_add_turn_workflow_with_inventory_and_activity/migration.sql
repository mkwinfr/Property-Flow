/*
  Warnings:

  - The values [NOT_STARTED,READY,ON_HOLD] on the enum `TurnStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- CreateEnum
CREATE TYPE "PunchListItemStatus" AS ENUM ('OPEN', 'COMPLETE');

-- CreateEnum
CREATE TYPE "TurnActivityType" AS ENUM ('ITEM_OPENED', 'ITEM_COMPLETED', 'ITEM_ADDED', 'PUNCH_LIST_COMPLETED', 'MANAGER_REVIEW_STARTED', 'MANAGER_APPROVED', 'MANAGER_REQUESTED_REWORK', 'INVENTORY_USED', 'COST_OVERRIDDEN', 'APPLIANCE_UPDATED', 'VENDOR_SERVICE_ADDED', 'TURN_STATUS_CHANGED');

-- AlterEnum
BEGIN;
CREATE TYPE "TurnStatus_new" AS ENUM ('PENDING', 'VACANT', 'IN_PROGRESS', 'PENDING_REVIEW', 'VACANT_READY');
ALTER TABLE "public"."Turn" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Turn" ALTER COLUMN "status" TYPE "TurnStatus_new" USING ("status"::text::"TurnStatus_new");
ALTER TYPE "TurnStatus" RENAME TO "TurnStatus_old";
ALTER TYPE "TurnStatus_new" RENAME TO "TurnStatus";
DROP TYPE "public"."TurnStatus_old";
ALTER TABLE "Turn" ALTER COLUMN "status" SET DEFAULT 'PENDING';
COMMIT;

-- AlterTable
ALTER TABLE "Turn" ADD COLUMN     "managerReviewNotes" TEXT,
ADD COLUMN     "reviewedAt" TIMESTAMP(3),
ADD COLUMN     "reviewedByUserId" INTEGER,
ALTER COLUMN "status" SET DEFAULT 'PENDING';

-- CreateTable
CREATE TABLE "PunchListItem" (
    "id" SERIAL NOT NULL,
    "turnId" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "area" TEXT NOT NULL DEFAULT 'General',
    "category" TEXT NOT NULL DEFAULT 'General',
    "status" "PunchListItemStatus" NOT NULL DEFAULT 'OPEN',
    "notes" TEXT,
    "assignedToUserId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "completedByUserId" INTEGER,

    CONSTRAINT "PunchListItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryItem" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "tags" TEXT[],
    "category" "WorkCategory" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitCost" DOUBLE PRECISION NOT NULL,
    "supplier" TEXT,
    "lastRestocked" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PunchItemInventoryUsage" (
    "id" SERIAL NOT NULL,
    "punchListItemId" INTEGER NOT NULL,
    "inventoryItemId" INTEGER NOT NULL,
    "quantityUsed" INTEGER NOT NULL,
    "unitCost" DOUBLE PRECISION NOT NULL,
    "costOverride" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PunchItemInventoryUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TurnCostBreakdown" (
    "id" SERIAL NOT NULL,
    "turnId" INTEGER NOT NULL,
    "laborCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "materialsCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "vendorServicesCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TurnCostBreakdown_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TurnActivityLog" (
    "id" SERIAL NOT NULL,
    "turnId" INTEGER NOT NULL,
    "userId" INTEGER,
    "activityType" "TurnActivityType" NOT NULL,
    "punchListItemId" INTEGER,
    "inventoryItemId" INTEGER,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TurnActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PunchListItem_turnId_idx" ON "PunchListItem"("turnId");

-- CreateIndex
CREATE INDEX "PunchListItem_status_idx" ON "PunchListItem"("status");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryItem_sku_key" ON "InventoryItem"("sku");

-- CreateIndex
CREATE INDEX "InventoryItem_category_idx" ON "InventoryItem"("category");

-- CreateIndex
CREATE INDEX "PunchItemInventoryUsage_punchListItemId_idx" ON "PunchItemInventoryUsage"("punchListItemId");

-- CreateIndex
CREATE INDEX "PunchItemInventoryUsage_inventoryItemId_idx" ON "PunchItemInventoryUsage"("inventoryItemId");

-- CreateIndex
CREATE UNIQUE INDEX "PunchItemInventoryUsage_punchListItemId_inventoryItemId_key" ON "PunchItemInventoryUsage"("punchListItemId", "inventoryItemId");

-- CreateIndex
CREATE UNIQUE INDEX "TurnCostBreakdown_turnId_key" ON "TurnCostBreakdown"("turnId");

-- CreateIndex
CREATE INDEX "TurnCostBreakdown_turnId_idx" ON "TurnCostBreakdown"("turnId");

-- CreateIndex
CREATE INDEX "TurnActivityLog_turnId_idx" ON "TurnActivityLog"("turnId");

-- CreateIndex
CREATE INDEX "TurnActivityLog_activityType_idx" ON "TurnActivityLog"("activityType");

-- CreateIndex
CREATE INDEX "TurnActivityLog_createdAt_idx" ON "TurnActivityLog"("createdAt");

-- AddForeignKey
ALTER TABLE "Turn" ADD CONSTRAINT "Turn_reviewedByUserId_fkey" FOREIGN KEY ("reviewedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PunchListItem" ADD CONSTRAINT "PunchListItem_turnId_fkey" FOREIGN KEY ("turnId") REFERENCES "Turn"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PunchListItem" ADD CONSTRAINT "PunchListItem_assignedToUserId_fkey" FOREIGN KEY ("assignedToUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PunchListItem" ADD CONSTRAINT "PunchListItem_completedByUserId_fkey" FOREIGN KEY ("completedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PunchItemInventoryUsage" ADD CONSTRAINT "PunchItemInventoryUsage_punchListItemId_fkey" FOREIGN KEY ("punchListItemId") REFERENCES "PunchListItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PunchItemInventoryUsage" ADD CONSTRAINT "PunchItemInventoryUsage_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TurnCostBreakdown" ADD CONSTRAINT "TurnCostBreakdown_turnId_fkey" FOREIGN KEY ("turnId") REFERENCES "Turn"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TurnActivityLog" ADD CONSTRAINT "TurnActivityLog_turnId_fkey" FOREIGN KEY ("turnId") REFERENCES "Turn"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TurnActivityLog" ADD CONSTRAINT "TurnActivityLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
