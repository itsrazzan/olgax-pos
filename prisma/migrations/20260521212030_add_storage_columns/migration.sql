-- AlterTable: Add storage-related columns to BusinessSettings
-- These columns were added to schema.prisma but migration was never generated.
ALTER TABLE "BusinessSettings"
ADD COLUMN IF NOT EXISTS "storageProvider" TEXT NOT NULL DEFAULT 'local',
ADD COLUMN IF NOT EXISTS "storageRegion" TEXT,
ADD COLUMN IF NOT EXISTS "storageBucket" TEXT,
ADD COLUMN IF NOT EXISTS "storageEndpoint" TEXT,
ADD COLUMN IF NOT EXISTS "storageAccessKey" TEXT,
ADD COLUMN IF NOT EXISTS "storageSecretKey" TEXT,
ADD COLUMN IF NOT EXISTS "storagePublicUrl" TEXT;
