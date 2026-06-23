CREATE TYPE "PlannedModuleStatus" AS ENUM ('SELECTED', 'EXEMPTED', 'PLANNED');

ALTER TABLE "planned_modules" ADD COLUMN "status" "PlannedModuleStatus" NOT NULL DEFAULT 'PLANNED';
ALTER TABLE "planned_modules" ADD COLUMN "user_id" UUID;

UPDATE "planned_modules"
SET "user_id" = "semesters"."user_id"
FROM "semesters"
WHERE "planned_modules"."semester_id" = "semesters"."id";

DELETE FROM "planned_modules"
WHERE "user_id" IS NULL;

ALTER TABLE "planned_modules" ALTER COLUMN "user_id" SET NOT NULL;
ALTER TABLE "planned_modules" ALTER COLUMN "semester_id" DROP NOT NULL;
ALTER TABLE "planned_modules" ALTER COLUMN "status" SET DEFAULT 'SELECTED';

CREATE INDEX "planned_modules_user_id_idx" ON "planned_modules"("user_id");
CREATE INDEX "planned_modules_status_idx" ON "planned_modules"("status");

ALTER TABLE "planned_modules" ADD CONSTRAINT "planned_modules_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
