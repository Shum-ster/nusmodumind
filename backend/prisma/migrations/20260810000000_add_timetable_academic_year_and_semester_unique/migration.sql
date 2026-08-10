ALTER TABLE "nus_modules"
ADD COLUMN "source_acad_year" TEXT NOT NULL DEFAULT '2026/2027';

ALTER TABLE "nus_modules"
ALTER COLUMN "source_acad_year" DROP DEFAULT;

CREATE UNIQUE INDEX "semesters_user_id_acad_year_semester_number_key"
ON "semesters"("user_id", "acad_year", "semester_number");
