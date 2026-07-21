UPDATE "planned_modules"
SET "actual_grade" = NULL
WHERE UPPER(TRIM("actual_grade")) = 'S/U';
