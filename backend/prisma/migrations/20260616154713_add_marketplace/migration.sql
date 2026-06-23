-- CreateTable
CREATE TABLE "public_plans" (
    "id" UUID NOT NULL,
    "author_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "plan_snapshot" JSONB NOT NULL,
    "upvotes" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "public_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plan_reviews" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "public_plan_id" UUID NOT NULL,
    "rating" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "plan_reviews_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public_plans" ADD CONSTRAINT "public_plans_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_reviews" ADD CONSTRAINT "plan_reviews_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_reviews" ADD CONSTRAINT "plan_reviews_public_plan_id_fkey" FOREIGN KEY ("public_plan_id") REFERENCES "public_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
