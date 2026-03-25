-- CreateTable
CREATE TABLE "QuestionnaireSubmission" (
    "id" TEXT NOT NULL,
    "questionnaireSlug" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "whatsappOptIn" BOOLEAN NOT NULL DEFAULT false,
    "selfScore" INTEGER,
    "futureScore" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuestionnaireSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "QuestionnaireSubmission_questionnaireSlug_idx" ON "QuestionnaireSubmission"("questionnaireSlug");

-- CreateIndex
CREATE INDEX "QuestionnaireSubmission_email_idx" ON "QuestionnaireSubmission"("email");

-- CreateIndex
CREATE INDEX "QuestionnaireSubmission_createdAt_idx" ON "QuestionnaireSubmission"("createdAt");
