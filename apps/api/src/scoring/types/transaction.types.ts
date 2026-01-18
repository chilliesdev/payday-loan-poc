/**
 * Represents a single bank transaction from Mono API
 */
export interface MonoTransaction {
  _id: string;
  type: 'credit' | 'debit' | string;
  amount: number;
  narration: string;
  date: string;
  balance: number;
}

/**
 * Result of affordability analysis
 */
export interface AffordabilityResult {
  averageSalary: number;
  paydayDetected: boolean;
  maxLoanAmount: number;
  expenseRatio: number;
  salaryTransactionsCount: number;
}
