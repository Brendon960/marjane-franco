-- Confirmação do agendamento pelo painel (quem/quando) e envio da confirmação pelo WhatsApp (Cloud API).
-- Só acrescenta colunas: nada existente é alterado.

-- CreateEnum
CREATE TYPE "WhatsappMessageStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

-- AlterTable
ALTER TABLE "appointments" ADD COLUMN     "confirmed_at" TIMESTAMPTZ(3),
ADD COLUMN     "confirmed_by_id" UUID,
ADD COLUMN     "whatsapp_confirmation_attempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "whatsapp_confirmation_error" VARCHAR(300),
ADD COLUMN     "whatsapp_confirmation_message_id" VARCHAR(128),
ADD COLUMN     "whatsapp_confirmation_sent_at" TIMESTAMPTZ(3),
ADD COLUMN     "whatsapp_confirmation_status" "WhatsappMessageStatus";

-- CreateIndex
CREATE UNIQUE INDEX "appointments_whatsapp_confirmation_message_id_key" ON "appointments"("whatsapp_confirmation_message_id");

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_confirmed_by_id_fkey" FOREIGN KEY ("confirmed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

