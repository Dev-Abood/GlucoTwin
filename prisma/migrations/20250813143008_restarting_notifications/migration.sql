-- CreateEnum
CREATE TYPE "public"."NotificationType" AS ENUM ('DANGEROUS_READING', 'NEW_MESSAGE', 'NEW_RECOMMENDATION', 'DAILY_REMINDER');

-- CreateEnum
CREATE TYPE "public"."SenderType" AS ENUM ('DOCTOR', 'PATIENT');

-- CreateEnum
CREATE TYPE "public"."ReadingType" AS ENUM ('BEFORE_BREAKFAST', 'AFTER_BREAKFAST', 'BEFORE_LUNCH', 'AFTER_LUNCH', 'BEFORE_DINNER', 'AFTER_DINNER');

-- CreateEnum
CREATE TYPE "public"."ReadingStatus" AS ENUM ('NORMAL', 'HIGH', 'ELEVATED');

-- CreateTable
CREATE TABLE "public"."Patient" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL DEFAULT '+1234567890',
    "name" TEXT NOT NULL,
    "age" INTEGER NOT NULL,
    "dateOfBirth" TIMESTAMP(3) NOT NULL,
    "term" INTEGER NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Patient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Doctor" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL DEFAULT '+1234567890',
    "name" TEXT NOT NULL,
    "specialty" TEXT,

    CONSTRAINT "Doctor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PatientAssignment" (
    "id" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "lastVisitDate" TIMESTAMP(3) NOT NULL,
    "addedDate" TIMESTAMP(3) NOT NULL,
    "hasMessageForDoctor" BOOLEAN NOT NULL DEFAULT false,
    "hasMessageForPatient" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "PatientAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Recommendation" (
    "id" TEXT NOT NULL,
    "patientAssignmentId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Recommendation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Reading" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "time" TEXT NOT NULL,
    "type" "public"."ReadingType" NOT NULL,
    "level" DOUBLE PRECISION NOT NULL,
    "status" "public"."ReadingStatus" NOT NULL DEFAULT 'NORMAL',
    "notes" TEXT,

    CONSTRAINT "Reading_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Message" (
    "id" TEXT NOT NULL,
    "patientAssignmentId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "senderType" "public"."SenderType" NOT NULL,
    "content" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isRead" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."notifications" (
    "id" TEXT NOT NULL,
    "type" "public"."NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "metadata" JSONB,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),
    "patientId" TEXT,
    "doctorId" TEXT,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Patient_patientId_key" ON "public"."Patient"("patientId");

-- CreateIndex
CREATE UNIQUE INDEX "Patient_email_key" ON "public"."Patient"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Doctor_email_key" ON "public"."Doctor"("email");

-- CreateIndex
CREATE INDEX "Recommendation_patientAssignmentId_idx" ON "public"."Recommendation"("patientAssignmentId");

-- CreateIndex
CREATE INDEX "notifications_patientId_isRead_isArchived_idx" ON "public"."notifications"("patientId", "isRead", "isArchived");

-- CreateIndex
CREATE INDEX "notifications_doctorId_isRead_isArchived_idx" ON "public"."notifications"("doctorId", "isRead", "isArchived");

-- CreateIndex
CREATE INDEX "notifications_createdAt_idx" ON "public"."notifications"("createdAt");

-- AddForeignKey
ALTER TABLE "public"."PatientAssignment" ADD CONSTRAINT "PatientAssignment_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "public"."Doctor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PatientAssignment" ADD CONSTRAINT "PatientAssignment_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "public"."Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Recommendation" ADD CONSTRAINT "Recommendation_patientAssignmentId_fkey" FOREIGN KEY ("patientAssignmentId") REFERENCES "public"."PatientAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Reading" ADD CONSTRAINT "Reading_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "public"."Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Message" ADD CONSTRAINT "Message_patientAssignmentId_fkey" FOREIGN KEY ("patientAssignmentId") REFERENCES "public"."PatientAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."notifications" ADD CONSTRAINT "notifications_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "public"."Patient"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."notifications" ADD CONSTRAINT "notifications_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "public"."Doctor"("id") ON DELETE SET NULL ON UPDATE CASCADE;
