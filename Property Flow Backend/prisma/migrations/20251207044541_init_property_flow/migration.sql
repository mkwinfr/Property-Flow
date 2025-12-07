-- CreateEnum
CREATE TYPE "OccupancyStatus" AS ENUM ('OCCUPIED', 'NOTICE', 'VACANT', 'DOWN');

-- CreateEnum
CREATE TYPE "TurnStatus" AS ENUM ('NONE', 'NOT_STARTED', 'IN_PROGRESS', 'READY', 'ON_HOLD', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TurnType" AS ENUM ('FULL_TURN', 'MINI_TURN', 'DOWN_REHAB');

-- CreateTable
CREATE TABLE "Apartment" (
    "id" SERIAL NOT NULL,
    "propertyId" INTEGER,
    "building" TEXT,
    "unitNumber" TEXT NOT NULL,
    "bedrooms" INTEGER,
    "bathrooms" INTEGER,
    "sqft" INTEGER,
    "occupancyStatus" "OccupancyStatus" NOT NULL DEFAULT 'OCCUPIED',
    "turnStatus" "TurnStatus" NOT NULL DEFAULT 'NONE',
    "canShow" BOOLEAN NOT NULL DEFAULT true,
    "canLease" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Apartment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Turn" (
    "id" SERIAL NOT NULL,
    "apartmentId" INTEGER NOT NULL,
    "type" "TurnType" NOT NULL,
    "status" "TurnStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "moveOutDate" TIMESTAMP(3),
    "targetReadyDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Turn_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Turn" ADD CONSTRAINT "Turn_apartmentId_fkey" FOREIGN KEY ("apartmentId") REFERENCES "Apartment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
