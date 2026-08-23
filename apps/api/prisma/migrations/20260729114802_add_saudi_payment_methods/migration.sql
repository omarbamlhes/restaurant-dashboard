-- Add Saudi-market payment rails to the PaymentMethod enum.
-- Postgres requires ADD VALUE outside a transaction; each is idempotent.
ALTER TYPE "PaymentMethod" ADD VALUE IF NOT EXISTS 'MADA';
ALTER TYPE "PaymentMethod" ADD VALUE IF NOT EXISTS 'STC_PAY';
ALTER TYPE "PaymentMethod" ADD VALUE IF NOT EXISTS 'APPLE_PAY';
ALTER TYPE "PaymentMethod" ADD VALUE IF NOT EXISTS 'TABBY';
ALTER TYPE "PaymentMethod" ADD VALUE IF NOT EXISTS 'TAMARA';
