/*
  Warnings:

  - You are about to drop the `User` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "User";

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "semesters" (
    "id" UUID NOT NULL,
    "acad_year" TEXT NOT NULL,
    "semester_number" INTEGER NOT NULL,
    "user_id" UUID NOT NULL,

    CONSTRAINT "semesters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "planned_modules" (
    "id" UUID NOT NULL,
    "semester_id" UUID NOT NULL,
    "module_code" TEXT NOT NULL,
    "expected_grade" TEXT,
    "actual_grade" TEXT,
    "selected_lessons" JSONB,

    CONSTRAINT "planned_modules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "module_reviews" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "module_code" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "module_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- AddForeignKey
ALTER TABLE "semesters" ADD CONSTRAINT "semesters_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planned_modules" ADD CONSTRAINT "planned_modules_semester_id_fkey" FOREIGN KEY ("semester_id") REFERENCES "semesters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planned_modules" ADD CONSTRAINT "planned_modules_module_code_fkey" FOREIGN KEY ("module_code") REFERENCES "nus_modules"("module_code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "module_reviews" ADD CONSTRAINT "module_reviews_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "module_reviews" ADD CONSTRAINT "module_reviews_module_code_fkey" FOREIGN KEY ("module_code") REFERENCES "nus_modules"("module_code") ON DELETE CASCADE ON UPDATE CASCADE;
