-- Migration: Add subscription system
-- Generated: 2025-06-25

-- Add subscriptionId to Payment table
ALTER TABLE "Payment" ADD COLUMN "subscriptionId" TEXT;

-- Create SubscriptionPlan enum
CREATE TYPE "SubscriptionPlan" AS ENUM ('WEEKLY', 'MONTHLY', 'YEARLY');

-- Create SubscriptionStatus enum
CREATE TYPE "SubscriptionStatus" AS ENUM ('PENDING', 'ACTIVE', 'CANCELLED', 'EXPIRED', 'FAILED');

-- Create Subscription table
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "planType" "SubscriptionPlan" NOT NULL DEFAULT 'WEEKLY',
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'PENDING',
    "dailyCoins" INTEGER NOT NULL DEFAULT 10,
    "periodDays" INTEGER NOT NULL DEFAULT 7,
    "startedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "provider" "PaymentProvider" NOT NULL,
    "providerOrderId" TEXT,
    "providerPaymentId" TEXT,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "totalCoinsCredited" INTEGER NOT NULL DEFAULT 0,
    "rawPayload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- Create unique indexes
CREATE UNIQUE INDEX "Subscription_provider_providerOrderId_key" ON "Subscription"("provider", "providerOrderId");
CREATE UNIQUE INDEX "Subscription_provider_providerPaymentId_key" ON "Subscription"("provider", "providerPaymentId");

-- Create regular indexes
CREATE INDEX "Subscription_userId_status_idx" ON "Subscription"("userId", "status");
CREATE INDEX "Subscription_expiresAt_idx" ON "Subscription"("expiresAt");

-- Add foreign key constraint
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add SUBSCRIPTION value to TransactionType enum
DO $$
BEGIN
    ALTER TYPE "TransactionType" ADD VALUE 'SUBSCRIPTION';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
