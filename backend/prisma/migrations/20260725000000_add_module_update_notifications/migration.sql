CREATE TYPE "ModuleUpdateNotificationStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

CREATE TABLE "module_update_notifications" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "module_code" TEXT NOT NULL,
    "acad_year" TEXT NOT NULL,
    "semester_number" INTEGER NOT NULL,
    "changes" JSONB NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "status" "ModuleUpdateNotificationStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "last_error" TEXT,
    "sent_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "module_update_notifications_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "module_update_notifications_user_id_module_code_acad_year_sem_key"
ON "module_update_notifications"(
    "user_id",
    "module_code",
    "acad_year",
    "semester_number",
    "fingerprint"
);

CREATE INDEX "module_update_notifications_status_attempts_idx"
ON "module_update_notifications"("status", "attempts");

ALTER TABLE "module_update_notifications"
ADD CONSTRAINT "module_update_notifications_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
