-- CreateTable
CREATE TABLE "settings" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("key")
);

-- AlterTable
ALTER TABLE "payment_methods" ADD COLUMN "qrCodeUrl" TEXT;

-- AlterTable
ALTER TABLE "orders" ADD COLUMN "recipientQrCodeUrl" TEXT;
