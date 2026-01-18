import { describe, it, expect, beforeEach } from 'vitest';
import { AffordabilityService } from '../affordability.service';
import { MonoTransaction } from '../types/transaction.types';

describe('AffordabilityService', () => {
  let service: AffordabilityService;

  beforeEach(() => {
    service = new AffordabilityService();
  });

  /**
   * Helper to create a mock transaction
   */
  const createTransaction = (overrides: Partial<MonoTransaction> = {}): MonoTransaction => ({
    _id: `txn_${Math.random().toString(36).substr(2, 9)}`,
    type: 'credit',
    amount: 50000,
    narration: 'SALARY PAYMENT',
    date: new Date().toISOString().split('T')[0],
    balance: 50000,
    ...overrides
  });

  /**
   * Helper to get date string N months ago
   */
  const getDateMonthsAgo = (months: number, day?: number): string => {
    const date = new Date();
    date.setMonth(date.getMonth() - months);
    if (day !== undefined) {
      date.setDate(day);
    }
    return date.toISOString().split('T')[0];
  };

  describe('calculateAffordability', () => {
    describe('empty or invalid input', () => {
      it('should return zero values for empty transactions array', () => {
        const result = service.calculateAffordability([]);

        expect(result.averageSalary).toBe(0);
        expect(result.paydayDetected).toBe(false);
        expect(result.maxLoanAmount).toBe(0);
        expect(result.expenseRatio).toBe(0);
        expect(result.salaryTransactionsCount).toBe(0);
      });

      it('should return zero values for null/undefined transactions', () => {
        const result = service.calculateAffordability(null as any);

        expect(result.averageSalary).toBe(0);
        expect(result.paydayDetected).toBe(false);
        expect(result.maxLoanAmount).toBe(0);
      });

      it('should return zero values when all transactions are debits', () => {
        const transactions = [
          createTransaction({ type: 'debit', amount: 5000, narration: 'ATM WITHDRAWAL' }),
          createTransaction({ type: 'debit', amount: 3000, narration: 'POS PAYMENT' })
        ];

        const result = service.calculateAffordability(transactions);

        expect(result.averageSalary).toBe(0);
        expect(result.paydayDetected).toBe(false);
        expect(result.maxLoanAmount).toBe(0);
        expect(result.salaryTransactionsCount).toBe(0);
      });
    });

    describe('salary detection', () => {
      it('should detect transactions with SALARY keyword', () => {
        const transactions = [
          createTransaction({ narration: 'SALARY PAYMENT FROM ACME CORP', amount: 100000 })
        ];

        const result = service.calculateAffordability(transactions);

        expect(result.salaryTransactionsCount).toBe(1);
        expect(result.averageSalary).toBe(100000);
      });

      it('should detect transactions with PAYROLL keyword', () => {
        const transactions = [createTransaction({ narration: 'PAYROLL TRANSFER', amount: 80000 })];

        const result = service.calculateAffordability(transactions);

        expect(result.salaryTransactionsCount).toBe(1);
        expect(result.averageSalary).toBe(80000);
      });

      it('should detect transactions with WAGES keyword', () => {
        const transactions = [
          createTransaction({ narration: 'MONTHLY WAGES CREDIT', amount: 60000 })
        ];

        const result = service.calculateAffordability(transactions);

        expect(result.salaryTransactionsCount).toBe(1);
        expect(result.averageSalary).toBe(60000);
      });

      it('should detect transactions with PAY keyword', () => {
        const transactions = [createTransaction({ narration: 'PAY FROM EMPLOYER', amount: 70000 })];

        const result = service.calculateAffordability(transactions);

        expect(result.salaryTransactionsCount).toBe(1);
        expect(result.averageSalary).toBe(70000);
      });

      it('should be case-insensitive when detecting salary keywords', () => {
        const transactions = [
          createTransaction({ narration: 'salary payment', amount: 50000 }),
          createTransaction({ narration: 'Payroll Credit', amount: 50000 })
        ];

        const result = service.calculateAffordability(transactions);

        expect(result.salaryTransactionsCount).toBe(2);
      });

      it('should not detect non-salary credits as salary', () => {
        const transactions = [
          createTransaction({ narration: 'TRANSFER FROM JOHN DOE', amount: 10000 }),
          createTransaction({ narration: 'REFUND', amount: 5000 }),
          createTransaction({ narration: 'INTEREST CREDIT', amount: 500 })
        ];

        const result = service.calculateAffordability(transactions);

        expect(result.salaryTransactionsCount).toBe(0);
        expect(result.averageSalary).toBe(0);
      });
    });

    describe('average salary calculation', () => {
      it('should calculate average from multiple salary transactions', () => {
        const transactions = [
          createTransaction({
            narration: 'SALARY PAYMENT',
            amount: 100000,
            date: getDateMonthsAgo(0, 15)
          }),
          createTransaction({
            narration: 'SALARY PAYMENT',
            amount: 110000,
            date: getDateMonthsAgo(1, 15)
          }),
          createTransaction({
            narration: 'SALARY PAYMENT',
            amount: 105000,
            date: getDateMonthsAgo(2, 15)
          })
        ];

        const result = service.calculateAffordability(transactions);

        expect(result.salaryTransactionsCount).toBe(3);
        expect(result.averageSalary).toBe(105000); // (100000 + 110000 + 105000) / 3
      });

      it('should round average salary to nearest integer', () => {
        const transactions = [
          createTransaction({ narration: 'SALARY', amount: 100000 }),
          createTransaction({ narration: 'SALARY', amount: 100001 })
        ];

        const result = service.calculateAffordability(transactions);

        // (100000 + 100001) / 2 = 100000.5 -> rounds to 100001
        expect(result.averageSalary).toBe(100001);
      });
    });

    describe('loan limit calculation', () => {
      it('should calculate maxLoanAmount as 33% of average salary', () => {
        const transactions = [createTransaction({ narration: 'SALARY PAYMENT', amount: 100000 })];

        const result = service.calculateAffordability(transactions);

        expect(result.maxLoanAmount).toBe(33000); // 100000 * 0.33
      });

      it('should floor the loan limit to avoid decimals', () => {
        const transactions = [createTransaction({ narration: 'SALARY PAYMENT', amount: 100001 })];

        const result = service.calculateAffordability(transactions);

        // 100001 * 0.33 = 33000.33 -> floors to 33000
        expect(result.maxLoanAmount).toBe(33000);
      });

      it('should return 0 loan limit when no salary detected', () => {
        const transactions = [
          createTransaction({ narration: 'TRANSFER FROM FRIEND', amount: 50000 })
        ];

        const result = service.calculateAffordability(transactions);

        expect(result.maxLoanAmount).toBe(0);
      });
    });

    describe('payday pattern detection', () => {
      it('should detect consistent payday pattern on same day of month', () => {
        const transactions = [
          createTransaction({
            narration: 'SALARY PAYMENT',
            amount: 100000,
            date: getDateMonthsAgo(0, 25)
          }),
          createTransaction({
            narration: 'SALARY PAYMENT',
            amount: 100000,
            date: getDateMonthsAgo(1, 25)
          }),
          createTransaction({
            narration: 'SALARY PAYMENT',
            amount: 100000,
            date: getDateMonthsAgo(2, 25)
          })
        ];

        const result = service.calculateAffordability(transactions);

        expect(result.paydayDetected).toBe(true);
      });

      it('should detect payday pattern within ±2 day tolerance', () => {
        const transactions = [
          createTransaction({
            narration: 'SALARY PAYMENT',
            amount: 100000,
            date: getDateMonthsAgo(0, 25)
          }),
          createTransaction({
            narration: 'SALARY PAYMENT',
            amount: 100000,
            date: getDateMonthsAgo(1, 27) // +2 days
          }),
          createTransaction({
            narration: 'SALARY PAYMENT',
            amount: 100000,
            date: getDateMonthsAgo(2, 23) // -2 days
          })
        ];

        const result = service.calculateAffordability(transactions);

        expect(result.paydayDetected).toBe(true);
      });

      it('should not detect payday pattern with only one salary transaction', () => {
        const transactions = [
          createTransaction({
            narration: 'SALARY PAYMENT',
            amount: 100000,
            date: getDateMonthsAgo(0, 25)
          })
        ];

        const result = service.calculateAffordability(transactions);

        expect(result.paydayDetected).toBe(false);
      });

      it('should not detect payday pattern when dates are inconsistent', () => {
        const transactions = [
          createTransaction({
            narration: 'SALARY PAYMENT',
            amount: 100000,
            date: getDateMonthsAgo(0, 5)
          }),
          createTransaction({
            narration: 'SALARY PAYMENT',
            amount: 100000,
            date: getDateMonthsAgo(1, 15)
          }),
          createTransaction({
            narration: 'SALARY PAYMENT',
            amount: 100000,
            date: getDateMonthsAgo(2, 25)
          })
        ];

        const result = service.calculateAffordability(transactions);

        expect(result.paydayDetected).toBe(false);
      });
    });

    describe('3-month filtering', () => {
      it('should only consider transactions from last 3 months', () => {
        const transactions = [
          createTransaction({
            narration: 'SALARY PAYMENT',
            amount: 100000,
            date: getDateMonthsAgo(0, 15) // Within 3 months
          }),
          createTransaction({
            narration: 'SALARY PAYMENT',
            amount: 200000,
            date: getDateMonthsAgo(4, 15) // Outside 3 months
          })
        ];

        const result = service.calculateAffordability(transactions);

        expect(result.salaryTransactionsCount).toBe(1);
        expect(result.averageSalary).toBe(100000); // Only the recent one
      });

      it('should exclude transactions exactly 3 months old', () => {
        const transactions = [
          createTransaction({
            narration: 'SALARY PAYMENT',
            amount: 100000,
            date: getDateMonthsAgo(1, 15)
          }),
          createTransaction({
            narration: 'SALARY PAYMENT',
            amount: 100000,
            date: getDateMonthsAgo(2, 15)
          })
        ];

        const result = service.calculateAffordability(transactions);

        expect(result.salaryTransactionsCount).toBe(2);
      });
    });

    describe('expense ratio calculation', () => {
      it('should calculate expense ratio as debits/credits', () => {
        const transactions = [
          createTransaction({ type: 'credit', narration: 'SALARY', amount: 100000 }),
          createTransaction({ type: 'debit', narration: 'RENT PAYMENT', amount: 30000 }),
          createTransaction({ type: 'debit', narration: 'GROCERIES', amount: 20000 })
        ];

        const result = service.calculateAffordability(transactions);

        // (30000 + 20000) / 100000 = 0.5
        expect(result.expenseRatio).toBe(0.5);
      });

      it('should return 0 expense ratio when no credits exist', () => {
        const transactions = [
          createTransaction({ type: 'debit', narration: 'RENT', amount: 30000 })
        ];

        const result = service.calculateAffordability(transactions);

        expect(result.expenseRatio).toBe(0);
      });

      it('should round expense ratio to 2 decimal places', () => {
        const transactions = [
          createTransaction({ type: 'credit', narration: 'SALARY', amount: 100000 }),
          createTransaction({ type: 'debit', narration: 'EXPENSES', amount: 33333 })
        ];

        const result = service.calculateAffordability(transactions);

        // 33333 / 100000 = 0.33333 -> rounds to 0.33
        expect(result.expenseRatio).toBe(0.33);
      });
    });

    describe('multiple income sources', () => {
      it('should average multiple salary sources together', () => {
        const transactions = [
          createTransaction({
            narration: 'SALARY FROM MAIN JOB',
            amount: 100000,
            date: getDateMonthsAgo(0, 25)
          }),
          createTransaction({
            narration: 'PAYROLL FROM SIDE GIG',
            amount: 50000,
            date: getDateMonthsAgo(0, 28)
          })
        ];

        const result = service.calculateAffordability(transactions);

        expect(result.salaryTransactionsCount).toBe(2);
        expect(result.averageSalary).toBe(75000); // (100000 + 50000) / 2
        expect(result.maxLoanAmount).toBe(24750); // 75000 * 0.33
      });
    });

    describe('real-world scenario', () => {
      it('should handle typical bank statement with mixed transactions', () => {
        const transactions = [
          // Month 1 (current)
          createTransaction({
            narration: 'SALARY CREDIT FROM ACME CORP',
            amount: 150000,
            type: 'credit',
            date: getDateMonthsAgo(0, 25)
          }),
          createTransaction({
            narration: 'ATM WITHDRAWAL',
            amount: 20000,
            type: 'debit',
            date: getDateMonthsAgo(0, 26)
          }),
          createTransaction({
            narration: 'RENT PAYMENT',
            amount: 50000,
            type: 'debit',
            date: getDateMonthsAgo(0, 28)
          }),
          createTransaction({
            narration: 'TRANSFER FROM JOHN',
            amount: 10000,
            type: 'credit',
            date: getDateMonthsAgo(0, 20)
          }),
          // Month 2
          createTransaction({
            narration: 'SALARY CREDIT FROM ACME CORP',
            amount: 150000,
            type: 'credit',
            date: getDateMonthsAgo(1, 25)
          }),
          createTransaction({
            narration: 'ELECTRICITY BILL',
            amount: 5000,
            type: 'debit',
            date: getDateMonthsAgo(1, 10)
          }),
          // Month 3
          createTransaction({
            narration: 'SALARY CREDIT FROM ACME CORP',
            amount: 140000,
            type: 'credit',
            date: getDateMonthsAgo(2, 24)
          }),
          createTransaction({
            narration: 'GROCERIES POS',
            amount: 15000,
            type: 'debit',
            date: getDateMonthsAgo(2, 15)
          })
        ];

        const result = service.calculateAffordability(transactions);

        expect(result.salaryTransactionsCount).toBe(3);
        expect(result.averageSalary).toBe(146667); // (150000 + 150000 + 140000) / 3 rounded
        expect(result.paydayDetected).toBe(true); // Day 25, 25, 24 - within tolerance
        expect(result.maxLoanAmount).toBe(48400); // 146667 * 0.33 floored
        // Total debits: 20000 + 50000 + 5000 + 15000 = 90000
        // Total credits: 150000 + 10000 + 150000 + 140000 = 450000
        // Expense ratio: 90000 / 450000 = 0.2
        expect(result.expenseRatio).toBe(0.2);
      });
    });
  });
});
