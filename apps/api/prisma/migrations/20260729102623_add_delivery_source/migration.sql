-- CreateEnum
CREATE TYPE "DeliverySource" AS ENUM ('IN_HOUSE', 'JAHEZ', 'HUNGERSTATION', 'TOYOU', 'KEETA', 'MRSOOL');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "deliverySource" "DeliverySource";
