-- Fase 2: perfis (CLIENT/ADMIN/SUPER_ADMIN), sessões, auditoria, fotos enviadas pelo painel,
-- cancelamento com histórico e link privado da cliente. Só acrescenta: nenhum dado existente é apagado.

-- AlterEnum
BEGIN;
CREATE TYPE "Role_new" AS ENUM ('CLIENT', 'ADMIN', 'SUPER_ADMIN');
ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "users" ALTER COLUMN "role" TYPE "Role_new" USING ((CASE "role"::text WHEN 'STAFF' THEN 'ADMIN' ELSE "role"::text END)::"Role_new");
ALTER TYPE "Role" RENAME TO "Role_old";
ALTER TYPE "Role_new" RENAME TO "Role";
DROP TYPE "Role_old";
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'ADMIN';
COMMIT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "last_login_at" TIMESTAMPTZ(3),
ADD COLUMN     "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "appointments" ADD COLUMN     "cancel_reason" VARCHAR(200),
ADD COLUMN     "cancelled_at" TIMESTAMPTZ(3),
ADD COLUMN     "cancelled_by" VARCHAR(20),
ADD COLUMN     "manage_token_hash" CHAR(64);

-- AlterTable
ALTER TABLE "blocked_times" ADD COLUMN     "created_by_id" UUID;

-- AlterTable
ALTER TABLE "business_settings" ADD COLUMN     "client_cancel_notice_hours" INTEGER NOT NULL DEFAULT 24;

-- CreateTable
CREATE TABLE "sessions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" CHAR(64) NOT NULL,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "last_seen_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip" VARCHAR(45),
    "user_agent" VARCHAR(200),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "actor_name" VARCHAR(100) NOT NULL,
    "action" VARCHAR(60) NOT NULL,
    "entity" VARCHAR(40) NOT NULL,
    "entity_id" VARCHAR(64),
    "description" VARCHAR(500) NOT NULL,
    "metadata" JSONB,
    "ip" VARCHAR(45),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media" (
    "id" UUID NOT NULL,
    "mime" VARCHAR(40) NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "bytes" INTEGER NOT NULL,
    "data" BYTEA NOT NULL,
    "created_by_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_settings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "online_booking_enabled" BOOLEAN NOT NULL DEFAULT true,
    "session_idle_minutes" INTEGER NOT NULL DEFAULT 480,
    "session_max_days" INTEGER NOT NULL DEFAULT 7,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_hash_key" ON "sessions"("token_hash");

-- CreateIndex
CREATE INDEX "sessions_user_id_idx" ON "sessions"("user_id");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- CreateIndex
CREATE INDEX "audit_logs_entity_entity_id_idx" ON "audit_logs"("entity", "entity_id");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "appointments_manage_token_hash_key" ON "appointments"("manage_token_hash");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media" ADD CONSTRAINT "media_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blocked_times" ADD CONSTRAINT "blocked_times_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;



-- ---------------------------------------------------------------------------
-- Regras de integridade escritas à mão
-- ---------------------------------------------------------------------------

ALTER TABLE "system_settings" ADD CONSTRAINT "system_settings_singleton" CHECK ("id" = 1);
ALTER TABLE "system_settings" ADD CONSTRAINT "system_settings_ranges" CHECK (
  "session_idle_minutes" BETWEEN 15 AND 1440 AND "session_max_days" BETWEEN 1 AND 30
);
ALTER TABLE "business_settings" ADD CONSTRAINT "business_settings_ranges" CHECK (
  "slot_interval_minutes" BETWEEN 5 AND 120
  AND "buffer_minutes" BETWEEN 0 AND 120
  AND "min_notice_minutes" BETWEEN 0 AND 10080
  AND "max_days_ahead" BETWEEN 1 AND 365
  AND "pending_hold_hours" BETWEEN 1 AND 72
  AND "client_cancel_notice_hours" BETWEEN 0 AND 168
);
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_cancelled_by_valid" CHECK (
  "cancelled_by" IS NULL OR "cancelled_by" IN ('admin', 'client')
);
ALTER TABLE "users" ADD CONSTRAINT "users_email_lowercase" CHECK ("email" = lower("email"));
ALTER TABLE "procedures" ADD CONSTRAINT "procedures_price_non_negative" CHECK ("price" IS NULL OR "price" >= 0);

INSERT INTO "system_settings" ("id") VALUES (1) ON CONFLICT DO NOTHING;
