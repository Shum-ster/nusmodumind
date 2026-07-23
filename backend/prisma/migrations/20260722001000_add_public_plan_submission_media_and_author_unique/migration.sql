ALTER TABLE "public_plans" ADD COLUMN "plan_image_data_url" TEXT;
ALTER TABLE "public_plans" ADD COLUMN "cover_image_data_url" TEXT;
CREATE UNIQUE INDEX "public_plans_author_id_key" ON "public_plans"("author_id");
