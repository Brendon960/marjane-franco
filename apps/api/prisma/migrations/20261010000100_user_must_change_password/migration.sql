-- M4 (segurança): senha provisória exige troca no próximo acesso.
-- Padrão false: contas existentes continuam funcionando como hoje.

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "must_change_password" BOOLEAN NOT NULL DEFAULT false;

