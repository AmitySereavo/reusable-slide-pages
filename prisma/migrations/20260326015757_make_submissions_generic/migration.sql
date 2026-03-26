/*
  Warnings:

  - You are about to drop the column `futureScore` on the `QuestionnaireSubmission` table. All the data in the column will be lost.
  - You are about to drop the column `selfScore` on the `QuestionnaireSubmission` table. All the data in the column will be lost.
  - Added the required column `answers` to the `QuestionnaireSubmission` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "QuestionnaireSubmission" DROP COLUMN "futureScore",
DROP COLUMN "selfScore",
ADD COLUMN     "answers" JSONB NOT NULL,
ALTER COLUMN "fullName" DROP NOT NULL,
ALTER COLUMN "email" DROP NOT NULL;
