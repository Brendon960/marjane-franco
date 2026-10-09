-- A2 (segurança): contato informado em CADA agendamento. O site público deixa de alterar o
-- cadastro global da cliente; os e-mails do agendamento vão para este contato.
-- Colunas opcionais, sem preenchimento retroativo: registros antigos continuam usando o cadastro da cliente.

-- AlterTable
ALTER TABLE "appointments" ADD COLUMN     "contact_email" VARCHAR(120),
ADD COLUMN     "contact_name" VARCHAR(100);

