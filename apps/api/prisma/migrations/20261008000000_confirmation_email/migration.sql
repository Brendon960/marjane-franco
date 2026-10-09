-- A confirmação ao cliente passa a ser por E-MAIL (a confirmação automática por WhatsApp foi removida).
-- Renomeia em vez de apagar e recriar: preserva o histórico de status/tentativas já gravados.

ALTER TYPE "WhatsappMessageStatus" RENAME TO "NotificationStatus";

ALTER TABLE "appointments" RENAME COLUMN "whatsapp_confirmation_status" TO "confirmation_email_status";
ALTER TABLE "appointments" RENAME COLUMN "whatsapp_confirmation_sent_at" TO "confirmation_email_sent_at";
ALTER TABLE "appointments" RENAME COLUMN "whatsapp_confirmation_error" TO "confirmation_email_error";
ALTER TABLE "appointments" RENAME COLUMN "whatsapp_confirmation_attempts" TO "confirmation_email_attempts";

-- O id de mensagem da Meta não se aplica a e-mail
DROP INDEX "appointments_whatsapp_confirmation_message_id_key";
ALTER TABLE "appointments" DROP COLUMN "whatsapp_confirmation_message_id";

ALTER TABLE "appointments" ADD COLUMN "confirmation_email_to" VARCHAR(120);
