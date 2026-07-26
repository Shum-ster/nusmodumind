CREATE TABLE "public_plan_likes" (
    "user_id" UUID NOT NULL,
    "public_plan_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "public_plan_likes_pkey" PRIMARY KEY ("user_id", "public_plan_id")
);

CREATE INDEX "public_plan_likes_public_plan_id_idx"
ON "public_plan_likes"("public_plan_id");

ALTER TABLE "public_plan_likes"
ADD CONSTRAINT "public_plan_likes_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public_plan_likes"
ADD CONSTRAINT "public_plan_likes_public_plan_id_fkey"
FOREIGN KEY ("public_plan_id") REFERENCES "public_plans"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

DELETE FROM "plan_reviews"
WHERE "id" IN (
    SELECT "id"
    FROM (
        SELECT
            "id",
            ROW_NUMBER() OVER (
                PARTITION BY "user_id", "public_plan_id"
                ORDER BY "created_at" DESC, "id" DESC
            ) AS "row_number"
        FROM "plan_reviews"
    ) AS "ranked_reviews"
    WHERE "row_number" > 1
);

CREATE UNIQUE INDEX "plan_reviews_user_id_public_plan_id_key"
ON "plan_reviews"("user_id", "public_plan_id");

ALTER TABLE "public_plans" DROP COLUMN "upvotes";
