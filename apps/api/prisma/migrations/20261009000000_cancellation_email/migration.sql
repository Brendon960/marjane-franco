-- Aviso de cancelamento por e-mail ao cliente (individual e em massa) e quem cancelou.
-- Reaproveita cancelled_at / cancel_reason; só acrescenta colunas.

-- AlterEnum
ALTER TYPE "NotificationStatus" ADD VALUE 'SKIPPED';

-- AlterTable
ALTER TABLE "appointments" ADD COLUMN     "cancellation_email_attempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "cancellation_email_error" VARCHAR(300),
ADD COLUMN     "cancellation_email_sent_at" TIMESTAMPTZ(3),
ADD COLUMN     "cancellation_email_status" "NotificationStatus",
ADD COLUMN     "cancellation_email_to" VARCHAR(120),
ADD COLUMN     "cancelled_by_id" UUID;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_cancelled_by_id_fkey" FOREIGN KEY ("cancelled_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

