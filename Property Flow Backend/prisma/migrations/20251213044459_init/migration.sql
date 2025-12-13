-- CreateEnum
CREATE TYPE "OccupancyStatus" AS ENUM ('OCCUPIED', 'NOTICE', 'VACANT', 'DOWN');

-- CreateEnum
CREATE TYPE "WorkOrderStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'CANCELED');

-- CreateEnum
CREATE TYPE "WorkOrderPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'EMERGENCY');

-- CreateEnum
CREATE TYPE "WorkOrderType" AS ENUM ('MAINTENANCE', 'MAKE_READY', 'VENDOR', 'INSPECTION', 'OTHER');

-- CreateEnum
CREATE TYPE "TurnStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'READY', 'ON_HOLD');

-- CreateEnum
CREATE TYPE "TurnType" AS ENUM ('STANDARD_MOVE_OUT', 'TRANSFER', 'RENOVATION', 'SPECIAL');

-- CreateEnum
CREATE TYPE "PriorityLevel" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'DOWN_UNIT');

-- CreateEnum
CREATE TYPE "OverallCondition" AS ENUM ('EXCELLENT', 'GOOD', 'FAIR', 'POOR', 'SEVERE');

-- CreateEnum
CREATE TYPE "ConditionTag" AS ENUM ('HEAVY_TRASH', 'ODORS', 'PET_DAMAGE', 'PESTS', 'MOLD_MOISTURE', 'SAFETY_ISSUES', 'APPLIANCE_ISSUES');

-- CreateEnum
CREATE TYPE "WorkCategory" AS ENUM ('GENERAL_MAINTENANCE', 'PAINT', 'CLEANING', 'FLOORING', 'APPLIANCES', 'HVAC', 'PLUMBING', 'ELECTRICAL', 'PEST_CONTROL', 'TRASH_OUT', 'VENDOR_SPECIALTY', 'OTHER');

-- CreateEnum
CREATE TYPE "TaskPriority" AS ENUM ('CRITICAL', 'HIGH', 'NORMAL', 'LOW');

-- CreateEnum
CREATE TYPE "BillableParty" AS ENUM ('OWNER', 'RESIDENT', 'SHARED', 'OTHER');

-- CreateEnum
CREATE TYPE "ChargebackType" AS ENUM ('NONE', 'PARTIAL', 'FULL');

-- CreateEnum
CREATE TYPE "TaskStatusEnum" AS ENUM ('PENDING', 'IN_PROGRESS', 'DONE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "VendorJobStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELED');

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Property" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "address1" TEXT,
    "address2" TEXT,
    "city" TEXT,
    "state" TEXT,
    "postalCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Property_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Building" (
    "id" SERIAL NOT NULL,
    "propertyId" INTEGER NOT NULL,
    "buildingNumber" TEXT NOT NULL,
    "name" TEXT,
    "floors" INTEGER,
    "unitsPerFloor" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Building_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Apartment" (
    "id" SERIAL NOT NULL,
    "propertyId" INTEGER NOT NULL,
    "buildingId" INTEGER NOT NULL,
    "unitNumber" TEXT NOT NULL,
    "building" TEXT,
    "floor" INTEGER,
    "beds" INTEGER,
    "baths" INTEGER,
    "sqFt" INTEGER,
    "status" "OccupancyStatus" NOT NULL DEFAULT 'OCCUPIED',
    "inlineNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Apartment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkOrder" (
    "id" SERIAL NOT NULL,
    "apartmentId" INTEGER NOT NULL,
    "createdByUserId" INTEGER NOT NULL,
    "assignedToUserId" INTEGER,
    "turnId" INTEGER,
    "type" "WorkOrderType" NOT NULL DEFAULT 'MAINTENANCE',
    "status" "WorkOrderStatus" NOT NULL DEFAULT 'OPEN',
    "priority" "WorkOrderPriority" NOT NULL DEFAULT 'MEDIUM',
    "summary" TEXT NOT NULL,
    "description" TEXT,
    "requestedBy" TEXT,
    "requestedAt" TIMESTAMP(3),
    "dueDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Turn" (
    "id" SERIAL NOT NULL,
    "propertyId" INTEGER,
    "unitId" INTEGER,
    "apartmentId" INTEGER NOT NULL,
    "createdByUserId" INTEGER NOT NULL,
    "type" "TurnType" NOT NULL DEFAULT 'STANDARD_MOVE_OUT',
    "status" "TurnStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "priority" "PriorityLevel" NOT NULL DEFAULT 'NORMAL',
    "moveOutDate" TIMESTAMP(3),
    "targetReadyDate" TIMESTAMP(3),
    "actualReadyDate" TIMESTAMP(3),
    "overallCondition" "OverallCondition",
    "wallsCondition" TEXT,
    "flooringCondition" TEXT,
    "doorsLocksCondition" TEXT,
    "plumbingCondition" TEXT,
    "electricalCondition" TEXT,
    "appliancesCondition" TEXT,
    "cleanlinessCondition" TEXT,
    "hasLifeSafetyIssues" BOOLEAN NOT NULL DEFAULT false,
    "lifeSafetyNotes" TEXT,
    "photoNotes" TEXT,
    "estimatedLaborCost" DOUBLE PRECISION,
    "estimatedMaterialsCost" DOUBLE PRECISION,
    "totalEstimatedCost" DOUBLE PRECISION,
    "turnOwnerId" TEXT,
    "accessInstructions" TEXT,
    "alarmCodes" TEXT,
    "chargebackType" "ChargebackType" NOT NULL DEFAULT 'NONE',
    "chargebackAmount" DOUBLE PRECISION,
    "chargebackReason" TEXT,
    "notes" TEXT,
    "turnNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Turn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TurnConditionTag" (
    "id" SERIAL NOT NULL,
    "turnId" INTEGER NOT NULL,
    "tag" "ConditionTag" NOT NULL,

    CONSTRAINT "TurnConditionTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TurnWorkCategory" (
    "id" SERIAL NOT NULL,
    "turnId" INTEGER NOT NULL,
    "category" "WorkCategory" NOT NULL,

    CONSTRAINT "TurnWorkCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TurnTask" (
    "id" SERIAL NOT NULL,
    "turnId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "category" "WorkCategory" NOT NULL,
    "area" TEXT NOT NULL DEFAULT 'WHOLE_UNIT',
    "priority" "TaskPriority" NOT NULL DEFAULT 'NORMAL',
    "status" "TaskStatusEnum" NOT NULL DEFAULT 'PENDING',
    "assignedToUserId" INTEGER,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "estimatedEffortValue" DOUBLE PRECISION,
    "estimatedEffortUnit" TEXT,
    "startDate" TIMESTAMP(3),
    "dueDate" TIMESTAMP(3),
    "mustCompleteBy" TIMESTAMP(3),
    "isAllDay" BOOLEAN NOT NULL DEFAULT false,
    "startTime" TEXT,
    "endTime" TEXT,
    "internalNotes" TEXT,
    "vendorNotes" TEXT,
    "budgetedCost" DOUBLE PRECISION,
    "billableTo" "BillableParty",
    "assigneeType" TEXT,
    "vendorId" INTEGER,
    "dependsOnTaskId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TurnTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TurnMaterial" (
    "id" SERIAL NOT NULL,
    "turnId" INTEGER NOT NULL,
    "item" TEXT NOT NULL,
    "category" "WorkCategory" NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "costPerUnit" DOUBLE PRECISION,
    "storeOrVendor" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TurnMaterial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vendor" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "contactName" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vendor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorJob" (
    "id" SERIAL NOT NULL,
    "apartmentId" INTEGER NOT NULL,
    "vendorId" INTEGER NOT NULL,
    "workOrderId" INTEGER,
    "status" "VendorJobStatus" NOT NULL DEFAULT 'SCHEDULED',
    "scopeOfWork" TEXT NOT NULL,
    "scheduledDate" TIMESTAMP(3),
    "completedDate" TIMESTAMP(3),
    "invoiceAmount" DOUBLE PRECISION,
    "invoiceNumber" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VendorJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaintenanceNote" (
    "id" SERIAL NOT NULL,
    "apartmentId" INTEGER NOT NULL,
    "createdByUserId" INTEGER NOT NULL,
    "body" TEXT NOT NULL,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaintenanceNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attachment" (
    "id" SERIAL NOT NULL,
    "apartmentId" INTEGER NOT NULL,
    "workOrderId" INTEGER,
    "turnId" INTEGER,
    "fileUrl" TEXT NOT NULL,
    "fileName" TEXT,
    "fileType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Attachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" SERIAL NOT NULL,
    "apartmentId" INTEGER NOT NULL,
    "userId" INTEGER,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Property_code_key" ON "Property"("code");

-- CreateIndex
CREATE INDEX "Building_propertyId_idx" ON "Building"("propertyId");

-- CreateIndex
CREATE UNIQUE INDEX "Building_propertyId_buildingNumber_key" ON "Building"("propertyId", "buildingNumber");

-- CreateIndex
CREATE INDEX "Apartment_propertyId_unitNumber_idx" ON "Apartment"("propertyId", "unitNumber");

-- CreateIndex
CREATE INDEX "WorkOrder_apartmentId_idx" ON "WorkOrder"("apartmentId");

-- CreateIndex
CREATE INDEX "WorkOrder_status_idx" ON "WorkOrder"("status");

-- CreateIndex
CREATE INDEX "WorkOrder_type_idx" ON "WorkOrder"("type");

-- CreateIndex
CREATE INDEX "Turn_apartmentId_idx" ON "Turn"("apartmentId");

-- CreateIndex
CREATE INDEX "Turn_status_idx" ON "Turn"("status");

-- CreateIndex
CREATE INDEX "Turn_priority_idx" ON "Turn"("priority");

-- CreateIndex
CREATE INDEX "TurnConditionTag_turnId_idx" ON "TurnConditionTag"("turnId");

-- CreateIndex
CREATE UNIQUE INDEX "TurnConditionTag_turnId_tag_key" ON "TurnConditionTag"("turnId", "tag");

-- CreateIndex
CREATE INDEX "TurnWorkCategory_turnId_idx" ON "TurnWorkCategory"("turnId");

-- CreateIndex
CREATE UNIQUE INDEX "TurnWorkCategory_turnId_category_key" ON "TurnWorkCategory"("turnId", "category");

-- CreateIndex
CREATE INDEX "TurnTask_turnId_idx" ON "TurnTask"("turnId");

-- CreateIndex
CREATE INDEX "TurnTask_status_idx" ON "TurnTask"("status");

-- CreateIndex
CREATE INDEX "TurnMaterial_turnId_idx" ON "TurnMaterial"("turnId");

-- CreateIndex
CREATE INDEX "VendorJob_apartmentId_idx" ON "VendorJob"("apartmentId");

-- CreateIndex
CREATE INDEX "VendorJob_vendorId_idx" ON "VendorJob"("vendorId");

-- CreateIndex
CREATE INDEX "MaintenanceNote_apartmentId_idx" ON "MaintenanceNote"("apartmentId");

-- CreateIndex
CREATE INDEX "Attachment_apartmentId_idx" ON "Attachment"("apartmentId");

-- CreateIndex
CREATE INDEX "ActivityLog_apartmentId_idx" ON "ActivityLog"("apartmentId");

-- CreateIndex
CREATE INDEX "ActivityLog_createdAt_idx" ON "ActivityLog"("createdAt");

-- AddForeignKey
ALTER TABLE "Building" ADD CONSTRAINT "Building_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Apartment" ADD CONSTRAINT "Apartment_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Apartment" ADD CONSTRAINT "Apartment_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "Building"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_apartmentId_fkey" FOREIGN KEY ("apartmentId") REFERENCES "Apartment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_assignedToUserId_fkey" FOREIGN KEY ("assignedToUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_turnId_fkey" FOREIGN KEY ("turnId") REFERENCES "Turn"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Turn" ADD CONSTRAINT "Turn_apartmentId_fkey" FOREIGN KEY ("apartmentId") REFERENCES "Apartment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Turn" ADD CONSTRAINT "Turn_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TurnConditionTag" ADD CONSTRAINT "TurnConditionTag_turnId_fkey" FOREIGN KEY ("turnId") REFERENCES "Turn"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TurnWorkCategory" ADD CONSTRAINT "TurnWorkCategory_turnId_fkey" FOREIGN KEY ("turnId") REFERENCES "Turn"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TurnTask" ADD CONSTRAINT "TurnTask_turnId_fkey" FOREIGN KEY ("turnId") REFERENCES "Turn"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TurnTask" ADD CONSTRAINT "TurnTask_assignedToUserId_fkey" FOREIGN KEY ("assignedToUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TurnMaterial" ADD CONSTRAINT "TurnMaterial_turnId_fkey" FOREIGN KEY ("turnId") REFERENCES "Turn"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorJob" ADD CONSTRAINT "VendorJob_apartmentId_fkey" FOREIGN KEY ("apartmentId") REFERENCES "Apartment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorJob" ADD CONSTRAINT "VendorJob_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorJob" ADD CONSTRAINT "VendorJob_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceNote" ADD CONSTRAINT "MaintenanceNote_apartmentId_fkey" FOREIGN KEY ("apartmentId") REFERENCES "Apartment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceNote" ADD CONSTRAINT "MaintenanceNote_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_apartmentId_fkey" FOREIGN KEY ("apartmentId") REFERENCES "Apartment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_turnId_fkey" FOREIGN KEY ("turnId") REFERENCES "Turn"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_apartmentId_fkey" FOREIGN KEY ("apartmentId") REFERENCES "Apartment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
