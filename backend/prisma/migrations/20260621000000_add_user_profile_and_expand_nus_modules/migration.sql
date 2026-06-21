ALTER TABLE "users" ADD COLUMN "username" TEXT;
ALTER TABLE "users" ADD COLUMN "faculty" TEXT;
ALTER TABLE "users" ADD COLUMN "degree" TEXT;

ALTER TABLE "nus_modules" ADD COLUMN "grading_basis_description" TEXT;
ALTER TABLE "nus_modules" ADD COLUMN "corequisite" TEXT;
ALTER TABLE "nus_modules" ADD COLUMN "attributes" JSONB;

UPDATE "nus_modules"
SET
  "description" = COALESCE("description", ''),
  "semester_data" = COALESCE("semester_data", '[]'::jsonb),
  "grading_basis_description" = COALESCE("grading_basis_description", 'Unknown');

ALTER TABLE "nus_modules" ALTER COLUMN "description" SET NOT NULL;
ALTER TABLE "nus_modules" ALTER COLUMN "module_credit" TYPE TEXT USING "module_credit"::TEXT;
ALTER TABLE "nus_modules" ALTER COLUMN "department" DROP NOT NULL;
ALTER TABLE "nus_modules" ALTER COLUMN "workload" TYPE JSONB USING
  CASE
    WHEN "workload" IS NULL THEN NULL
    ELSE "workload"::jsonb
  END;
ALTER TABLE "nus_modules" ALTER COLUMN "semester_data" SET NOT NULL;
ALTER TABLE "nus_modules" ALTER COLUMN "grading_basis_description" SET NOT NULL;
