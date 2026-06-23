-- CreateTable
CREATE TABLE "nus_modules" (
    "module_code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "module_credit" INTEGER NOT NULL,
    "department" TEXT NOT NULL,
    "faculty" TEXT NOT NULL,
    "prerequisite" TEXT,
    "preclusion" TEXT,
    "workload" TEXT,
    "semester_data" JSONB,
    "last_updated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "nus_modules_pkey" PRIMARY KEY ("module_code")
);
