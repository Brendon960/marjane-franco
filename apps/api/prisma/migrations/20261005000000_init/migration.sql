-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'STAFF');

-- CreateEnum
CREATE TYPE "ProcedureCategory" AS ENUM ('PELE', 'HARMONIZACAO', 'CORPORAL', 'AVALIACAO');

-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED', 'EXPIRED', 'COMPLETED', 'NO_SHOW');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "email" VARCHAR(120) NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'ADMIN',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clients" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "phone" VARCHAR(13) NOT NULL,
    "email" VARCHAR(120),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "procedures" (
    "id" UUID NOT NULL,
    "slug" VARCHAR(80) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "category" "ProcedureCategory" NOT NULL,
    "short_description" VARCHAR(300) NOT NULL,
    "description" TEXT NOT NULL,
    "highlights" TEXT[],
    "duration_minutes" INTEGER NOT NULL,
    "price" DECIMAL(10,2),
    "image_url" TEXT,
    "requires_evaluation" BOOLEAN NOT NULL DEFAULT false,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "procedures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointments" (
    "id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "procedure_id" UUID NOT NULL,
    "starts_at" TIMESTAMPTZ(3) NOT NULL,
    "ends_at" TIMESTAMPTZ(3) NOT NULL,
    "duration_minutes" INTEGER NOT NULL,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'PENDING',
    "notes" VARCHAR(500),
    "source" VARCHAR(20) NOT NULL DEFAULT 'site',
    "expires_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_hours" (
    "id" SERIAL NOT NULL,
    "day_of_week" SMALLINT NOT NULL,
    "start_time" CHAR(5) NOT NULL,
    "end_time" CHAR(5) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "business_hours_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blocked_times" (
    "id" UUID NOT NULL,
    "starts_at" TIMESTAMPTZ(3) NOT NULL,
    "ends_at" TIMESTAMPTZ(3) NOT NULL,
    "reason" VARCHAR(120),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blocked_times_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_settings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "slot_interval_minutes" INTEGER NOT NULL DEFAULT 30,
    "buffer_minutes" INTEGER NOT NULL DEFAULT 0,
    "min_notice_minutes" INTEGER NOT NULL DEFAULT 120,
    "max_days_ahead" INTEGER NOT NULL DEFAULT 60,
    "pending_hold_hours" INTEGER NOT NULL DEFAULT 12,
    "payment_methods" TEXT[],
    "address" VARCHAR(200),
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "business_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "clients_phone_key" ON "clients"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "procedures_slug_key" ON "procedures"("slug");

-- CreateIndex
CREATE INDEX "procedures_active_sort_order_idx" ON "procedures"("active", "sort_order");

-- CreateIndex
CREATE INDEX "appointments_starts_at_idx" ON "appointments"("starts_at");

-- CreateIndex
CREATE INDEX "appointments_client_id_idx" ON "appointments"("client_id");

-- CreateIndex
CREATE INDEX "appointments_status_expires_at_idx" ON "appointments"("status", "expires_at");

-- CreateIndex
CREATE INDEX "business_hours_day_of_week_idx" ON "business_hours"("day_of_week");

-- CreateIndex
CREATE INDEX "blocked_times_starts_at_ends_at_idx" ON "blocked_times"("starts_at", "ends_at");

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_procedure_id_fkey" FOREIGN KEY ("procedure_id") REFERENCES "procedures"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- ---------------------------------------------------------------------------
-- Regras de integridade que o Prisma não expressa (escritas à mão)
-- ---------------------------------------------------------------------------

-- Impede dois agendamentos ativos com horários sobrepostos, mesmo sob concorrência
-- (duas pessoas confirmando o mesmo horário no mesmo instante). O intervalo é
-- semiaberto [início, fim): 10:00–11:00 e 11:00–12:00 não conflitam.
-- Se no futuro houver mais de uma profissional, incluir professional_id WITH = (extensão btree_gist).
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_no_overlap"
  EXCLUDE USING gist (tstzrange("starts_at", "ends_at", '[)') WITH &&)
  WHERE ("status" IN ('PENDING', 'CONFIRMED'));

ALTER TABLE "appointments" ADD CONSTRAINT "appointments_valid_range" CHECK ("ends_at" > "starts_at");
ALTER TABLE "blocked_times" ADD CONSTRAINT "blocked_times_valid_range" CHECK ("ends_at" > "starts_at");

ALTER TABLE "business_hours" ADD CONSTRAINT "business_hours_valid" CHECK (
  "day_of_week" BETWEEN 0 AND 6
  AND "start_time" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
  AND "end_time" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
  AND "end_time" > "start_time"
);

ALTER TABLE "procedures" ADD CONSTRAINT "procedures_duration_positive" CHECK ("duration_minutes" > 0);
ALTER TABLE "business_settings" ADD CONSTRAINT "business_settings_singleton" CHECK ("id" = 1);
