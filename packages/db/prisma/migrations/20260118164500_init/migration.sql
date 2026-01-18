-- AlterTable
ALTER TABLE "User" ADD COLUMN     "maxLoanAmount" INTEGER,
ADD COLUMN     "monoAccountId" TEXT;

-- CreateTable
CREATE TABLE "FinancialSnapshot" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "averageSalary" INTEGER NOT NULL,
    "paydayDetected" BOOLEAN NOT NULL,
    "expenseRatio" DOUBLE PRECISION NOT NULL,
    "rawStatementData" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FinancialSnapshot_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "FinancialSnapshot" ADD CONSTRAINT "FinancialSnapshot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
