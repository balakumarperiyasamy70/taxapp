-- CreateEnum
CREATE TYPE "Role" AS ENUM ('FILER', 'PREPARER', 'ADMIN');

-- CreateEnum
CREATE TYPE "ReturnType" AS ENUM ('F1040', 'F1120S', 'F1065');

-- CreateEnum
CREATE TYPE "ReturnStatus" AS ENUM ('DRAFT', 'IN_REVIEW', 'PENDING_SIGNATURE', 'SIGNED', 'SUBMITTED', 'ACCEPTED', 'REJECTED', 'AMENDED', 'EXTENSION_FILED', 'EXTENSION_REJECTED');

-- CreateEnum
CREATE TYPE "ExtensionForm" AS ENUM ('F4868', 'F7004');

-- CreateEnum
CREATE TYPE "ExtensionStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'ACCEPTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ExtensionTrigger" AS ENUM ('PREPARER', 'CLIENT');

-- CreateEnum
CREATE TYPE "FilingStatus" AS ENUM ('SINGLE', 'MARRIED_FILING_JOINTLY', 'MARRIED_FILING_SEPARATELY', 'HEAD_OF_HOUSEHOLD', 'QUALIFYING_SURVIVING_SPOUSE');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('W2', 'F1099_NEC', 'F1099_MISC', 'F1099_INT', 'F1099_DIV', 'K1', 'F8879', 'EXTENSION_CONF', 'OTHER');

-- CreateEnum
CREATE TYPE "SignatureStatus" AS ENUM ('PENDING', 'SIGNED', 'DECLINED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'SENT', 'PAID', 'VOID');

-- CreateTable
CREATE TABLE "Firm" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ein" TEXT,
    "efin" TEXT,
    "ptin" TEXT,
    "address" TEXT,
    "phone" TEXT,
    "website" TEXT,
    "logoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Firm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "firmId" TEXT,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'FILER',
    "ptin" TEXT,
    "phone" TEXT,
    "avatarUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "firmId" TEXT NOT NULL,
    "userId" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "ssn" TEXT,
    "dob" TIMESTAMP(3),
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zip" TEXT,
    "businessName" TEXT,
    "ein" TEXT,
    "entityType" "ReturnType",
    "intakeCompleted" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Dependent" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "ssn" TEXT,
    "dob" TIMESTAMP(3),
    "relationship" TEXT NOT NULL,
    "monthsLived" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Dependent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaxReturn" (
    "id" TEXT NOT NULL,
    "firmId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "preparerId" TEXT,
    "reviewerId" TEXT,
    "taxYear" INTEGER NOT NULL,
    "returnType" "ReturnType" NOT NULL,
    "status" "ReturnStatus" NOT NULL DEFAULT 'DRAFT',
    "isAmended" BOOLEAN NOT NULL DEFAULT false,
    "originalReturnId" TEXT,
    "stateCode" TEXT,
    "irsSubmissionId" TEXT,
    "irsAckCode" TEXT,
    "irsAckAt" TIMESTAMP(3),
    "irsAckMessage" TEXT,
    "refundAmount" DECIMAL(12,2),
    "amountOwed" DECIMAL(12,2),
    "readyForReview" BOOLEAN NOT NULL DEFAULT false,
    "readyForClient" BOOLEAN NOT NULL DEFAULT false,
    "lockedAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3),
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaxReturn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "F1040Data" (
    "id" TEXT NOT NULL,
    "returnId" TEXT NOT NULL,
    "filingStatus" "FilingStatus",
    "spouseFirstName" TEXT,
    "spouseLastName" TEXT,
    "spouseSsn" TEXT,
    "spouseDob" TIMESTAMP(3),
    "totalIncome" DECIMAL(12,2),
    "adjustedGrossIncome" DECIMAL(12,2),
    "standardDeduction" DECIMAL(12,2),
    "itemizedDeduction" DECIMAL(12,2),
    "taxableIncome" DECIMAL(12,2),
    "totalTax" DECIMAL(12,2),
    "totalPayments" DECIMAL(12,2),
    "refundOrOwed" DECIMAL(12,2),
    "useItemized" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "F1040Data_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "F1120SData" (
    "id" TEXT NOT NULL,
    "returnId" TEXT NOT NULL,
    "businessName" TEXT,
    "ein" TEXT,
    "incorporationDate" TIMESTAMP(3),
    "sCorpElectionDate" TIMESTAMP(3),
    "businessActivity" TEXT,
    "grossReceipts" DECIMAL(14,2),
    "totalAssets" DECIMAL(14,2),
    "ordinaryIncome" DECIMAL(14,2),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "F1120SData_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Shareholder" (
    "id" TEXT NOT NULL,
    "f1120sId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ssn" TEXT,
    "ownershipPct" DECIMAL(5,4) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Shareholder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "F1065Data" (
    "id" TEXT NOT NULL,
    "returnId" TEXT NOT NULL,
    "businessName" TEXT,
    "ein" TEXT,
    "businessActivity" TEXT,
    "grossReceipts" DECIMAL(14,2),
    "totalAssets" DECIMAL(14,2),
    "ordinaryIncome" DECIMAL(14,2),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "F1065Data_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Partner" (
    "id" TEXT NOT NULL,
    "f1065Id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ssn" TEXT,
    "partnershipPct" DECIMAL(5,4) NOT NULL,
    "isGeneral" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Partner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "K1" (
    "id" TEXT NOT NULL,
    "f1120sId" TEXT,
    "f1065Id" TEXT,
    "recipientReturnId" TEXT,
    "recipientName" TEXT NOT NULL,
    "recipientSsn" TEXT,
    "ordinaryIncome" DECIMAL(12,2),
    "capitalGains" DECIMAL(12,2),
    "otherIncome" DECIMAL(12,2),
    "deductions" DECIMAL(12,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "K1_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Schedule" (
    "id" TEXT NOT NULL,
    "returnId" TEXT NOT NULL,
    "scheduleType" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "isComplete" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Schedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IncomeItem" (
    "id" TEXT NOT NULL,
    "returnId" TEXT NOT NULL,
    "type" "DocumentType" NOT NULL,
    "payerName" TEXT,
    "payerEin" TEXT,
    "amount" DECIMAL(12,2) NOT NULL,
    "federalWithheld" DECIMAL(12,2),
    "stateWithheld" DECIMAL(12,2),
    "stateCode" TEXT,
    "boxData" JSONB,
    "documentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IncomeItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StateReturn" (
    "id" TEXT NOT NULL,
    "returnId" TEXT NOT NULL,
    "stateCode" TEXT NOT NULL,
    "status" "ReturnStatus" NOT NULL DEFAULT 'DRAFT',
    "irsSubmissionId" TEXT,
    "irsAckCode" TEXT,
    "irsAckAt" TIMESTAMP(3),
    "refundAmount" DECIMAL(12,2),
    "amountOwed" DECIMAL(12,2),
    "data" JSONB,
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StateReturn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Extension" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "returnId" TEXT,
    "firmId" TEXT,
    "triggeredBy" "ExtensionTrigger" NOT NULL,
    "initiatedByUserId" TEXT,
    "extensionForm" "ExtensionForm" NOT NULL,
    "taxYear" INTEGER NOT NULL,
    "returnType" "ReturnType" NOT NULL,
    "status" "ExtensionStatus" NOT NULL DEFAULT 'DRAFT',
    "estimatedTaxOwed" DECIMAL(12,2),
    "estimatedPayments" DECIMAL(12,2),
    "balanceDue" DECIMAL(12,2),
    "irsSubmissionId" TEXT,
    "irsAckCode" TEXT,
    "irsAckAt" TIMESTAMP(3),
    "irsAckMessage" TEXT,
    "originalDueDate" TIMESTAMP(3) NOT NULL,
    "extendedDueDate" TIMESTAMP(3) NOT NULL,
    "submittedAt" TIMESTAMP(3),
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Extension_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "returnId" TEXT,
    "type" "DocumentType" NOT NULL,
    "filename" TEXT NOT NULL,
    "s3Key" TEXT NOT NULL,
    "s3Bucket" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Signature" (
    "id" TEXT NOT NULL,
    "returnId" TEXT NOT NULL,
    "signerName" TEXT NOT NULL,
    "signerEmail" TEXT NOT NULL,
    "signerRole" TEXT NOT NULL,
    "status" "SignatureStatus" NOT NULL DEFAULT 'PENDING',
    "signedAt" TIMESTAMP(3),
    "ipAddress" TEXT,
    "documentUrl" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Signature_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "firmId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "returnId" TEXT,
    "stripeInvoiceId" TEXT,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "amountCents" INTEGER NOT NULL,
    "dueDate" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceLineItem" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvoiceLineItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeadlineConfig" (
    "id" TEXT NOT NULL,
    "firmId" TEXT NOT NULL,
    "returnType" "ReturnType" NOT NULL,
    "taxYear" INTEGER NOT NULL,
    "originalDue" TIMESTAMP(3) NOT NULL,
    "extensionDue" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeadlineConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "link" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "returnId" TEXT,
    "action" TEXT NOT NULL,
    "detail" JSONB,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Firm_ein_key" ON "Firm"("ein");

-- CreateIndex
CREATE UNIQUE INDEX "Firm_efin_key" ON "Firm"("efin");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Client_userId_key" ON "Client"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "F1040Data_returnId_key" ON "F1040Data"("returnId");

-- CreateIndex
CREATE UNIQUE INDEX "F1120SData_returnId_key" ON "F1120SData"("returnId");

-- CreateIndex
CREATE UNIQUE INDEX "F1065Data_returnId_key" ON "F1065Data"("returnId");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_stripeInvoiceId_key" ON "Invoice"("stripeInvoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "DeadlineConfig_firmId_returnType_taxYear_key" ON "DeadlineConfig"("firmId", "returnType", "taxYear");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_firmId_fkey" FOREIGN KEY ("firmId") REFERENCES "Firm"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_firmId_fkey" FOREIGN KEY ("firmId") REFERENCES "Firm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dependent" ADD CONSTRAINT "Dependent_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaxReturn" ADD CONSTRAINT "TaxReturn_firmId_fkey" FOREIGN KEY ("firmId") REFERENCES "Firm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaxReturn" ADD CONSTRAINT "TaxReturn_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaxReturn" ADD CONSTRAINT "TaxReturn_preparerId_fkey" FOREIGN KEY ("preparerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaxReturn" ADD CONSTRAINT "TaxReturn_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaxReturn" ADD CONSTRAINT "TaxReturn_originalReturnId_fkey" FOREIGN KEY ("originalReturnId") REFERENCES "TaxReturn"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "F1040Data" ADD CONSTRAINT "F1040Data_returnId_fkey" FOREIGN KEY ("returnId") REFERENCES "TaxReturn"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "F1120SData" ADD CONSTRAINT "F1120SData_returnId_fkey" FOREIGN KEY ("returnId") REFERENCES "TaxReturn"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shareholder" ADD CONSTRAINT "Shareholder_f1120sId_fkey" FOREIGN KEY ("f1120sId") REFERENCES "F1120SData"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "F1065Data" ADD CONSTRAINT "F1065Data_returnId_fkey" FOREIGN KEY ("returnId") REFERENCES "TaxReturn"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Partner" ADD CONSTRAINT "Partner_f1065Id_fkey" FOREIGN KEY ("f1065Id") REFERENCES "F1065Data"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "K1" ADD CONSTRAINT "K1_f1120sId_fkey" FOREIGN KEY ("f1120sId") REFERENCES "F1120SData"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "K1" ADD CONSTRAINT "K1_f1065Id_fkey" FOREIGN KEY ("f1065Id") REFERENCES "F1065Data"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Schedule" ADD CONSTRAINT "Schedule_returnId_fkey" FOREIGN KEY ("returnId") REFERENCES "TaxReturn"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncomeItem" ADD CONSTRAINT "IncomeItem_returnId_fkey" FOREIGN KEY ("returnId") REFERENCES "TaxReturn"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StateReturn" ADD CONSTRAINT "StateReturn_returnId_fkey" FOREIGN KEY ("returnId") REFERENCES "TaxReturn"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Extension" ADD CONSTRAINT "Extension_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Extension" ADD CONSTRAINT "Extension_returnId_fkey" FOREIGN KEY ("returnId") REFERENCES "TaxReturn"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Extension" ADD CONSTRAINT "Extension_initiatedByUserId_fkey" FOREIGN KEY ("initiatedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_returnId_fkey" FOREIGN KEY ("returnId") REFERENCES "TaxReturn"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Signature" ADD CONSTRAINT "Signature_returnId_fkey" FOREIGN KEY ("returnId") REFERENCES "TaxReturn"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_firmId_fkey" FOREIGN KEY ("firmId") REFERENCES "Firm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_returnId_fkey" FOREIGN KEY ("returnId") REFERENCES "TaxReturn"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceLineItem" ADD CONSTRAINT "InvoiceLineItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeadlineConfig" ADD CONSTRAINT "DeadlineConfig_firmId_fkey" FOREIGN KEY ("firmId") REFERENCES "Firm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_returnId_fkey" FOREIGN KEY ("returnId") REFERENCES "TaxReturn"("id") ON DELETE SET NULL ON UPDATE CASCADE;
