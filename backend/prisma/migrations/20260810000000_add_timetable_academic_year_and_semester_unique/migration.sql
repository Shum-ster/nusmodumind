BEGIN;

ALTER TABLE "nus_modules"
ADD COLUMN "source_acad_year" TEXT NOT NULL DEFAULT 'UNKNOWN';

ALTER TABLE "nus_modules"
ALTER COLUMN "source_acad_year" DROP DEFAULT;

-- Older releases allowed duplicate semester rows. Preserve every planned
-- module by moving it to one deterministic survivor before adding the unique
-- index, then remove only the duplicate semester records.
CREATE TEMP TABLE "_migration_semester_merge_map" ON COMMIT DROP AS
SELECT
  "id" AS "semester_id",
  FIRST_VALUE("id") OVER (
    PARTITION BY "user_id", "acad_year", "semester_number"
    ORDER BY "id"::text
  ) AS "survivor_id"
FROM "semesters";

UPDATE "planned_modules" AS "planned_module"
SET "semester_id" = "merge_map"."survivor_id"
FROM "_migration_semester_merge_map" AS "merge_map"
WHERE "planned_module"."semester_id" = "merge_map"."semester_id"
  AND "merge_map"."semester_id" <> "merge_map"."survivor_id";

DELETE FROM "semesters" AS "semester"
USING "_migration_semester_merge_map" AS "merge_map"
WHERE "semester"."id" = "merge_map"."semester_id"
  AND "merge_map"."semester_id" <> "merge_map"."survivor_id";

CREATE UNIQUE INDEX "semesters_user_id_acad_year_semester_number_key"
ON "semesters"("user_id", "acad_year", "semester_number");

COMMIT;
