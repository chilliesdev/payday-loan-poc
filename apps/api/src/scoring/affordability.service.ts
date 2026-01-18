import { Injectable } from '@nestjs/common';
import { MonoTransaction, AffordabilityResult } from './types/transaction.types';

/**
 * Keywords that indicate a salary/payroll transaction
 */
const SALARY_KEYWORDS = ['SALARY', 'PAYROLL', 'WAGES', 'PAY'];

/**
 * Tolerance in days for payday consistency detection (±2 days)
 */
const PAYDAY_TOLERANCE_DAYS = 2;

/**
 * Minimum number of consistent salary payments to detect payday pattern
 */
const MIN_CONSISTENT_PAYMENTS = 2;

/**
 * Loan limit as percentage of average salary (33%)
 */
const LOAN_LIMIT_PERCENTAGE = 0.33;

@Injectable()
export class AffordabilityService {
  /**
   * Calculate affordability based on transaction history
   * @param transactions - Array of bank transactions from Mono
   * @returns AffordabilityResult with calculated loan limit
   */
  calculateAffordability(transactions: MonoTransaction[]): AffordabilityResult {
    if (!transactions || transactions.length === 0) {
      return {
        averageSalary: 0,
        paydayDetected: false,
        maxLoanAmount: 0,
        expenseRatio: 0,
        salaryTransactionsCount: 0
      };
    }

    // Filter to last 3 months only
    const threeMonthsAgo = this.getDateMonthsAgo(3);
    const recentTransactions = transactions.filter((txn) => new Date(txn.date) >= threeMonthsAgo);

    // Separate credits and debits
    const credits = recentTransactions.filter((txn) => txn.type === 'credit');
    const debits = recentTransactions.filter((txn) => txn.type === 'debit');

    // Detect salary transactions
    const salaryTransactions = this.detectSalaryTransactions(credits);

    // Calculate average salary
    const averageSalary = this.calculateAverageSalary(salaryTransactions);

    // Detect payday pattern consistency
    const paydayDetected = this.detectPaydayPattern(salaryTransactions);

    // Calculate expense ratio (total debits / total credits)
    const expenseRatio = this.calculateExpenseRatio(credits, debits);

    // Calculate max loan amount (33% of average salary)
    const maxLoanAmount = Math.floor(averageSalary * LOAN_LIMIT_PERCENTAGE);

    return {
      averageSalary,
      paydayDetected,
      maxLoanAmount,
      expenseRatio,
      salaryTransactionsCount: salaryTransactions.length
    };
  }

  /**
   * Get date N months ago from today
   */
  private getDateMonthsAgo(months: number): Date {
    const date = new Date();
    date.setMonth(date.getMonth() - months);
    date.setHours(0, 0, 0, 0);
    return date;
  }

  /**
   * Detect transactions that appear to be salary payments
   * Uses narration keywords like SALARY, PAYROLL, WAGES
   */
  private detectSalaryTransactions(credits: MonoTransaction[]): MonoTransaction[] {
    return credits.filter((txn) => {
      const narrationUpper = txn.narration.toUpperCase();
      return SALARY_KEYWORDS.some((keyword) => narrationUpper.includes(keyword));
    });
  }

  /**
   * Calculate average salary from detected salary transactions
   */
  private calculateAverageSalary(salaryTransactions: MonoTransaction[]): number {
    if (salaryTransactions.length === 0) {
      return 0;
    }

    const total = salaryTransactions.reduce((sum, txn) => sum + txn.amount, 0);
    return Math.round(total / salaryTransactions.length);
  }

  /**
   * Detect if salary payments follow a consistent payday pattern
   * Checks if payments occur on approximately the same day of month (±2 days)
   */
  private detectPaydayPattern(salaryTransactions: MonoTransaction[]): boolean {
    if (salaryTransactions.length < MIN_CONSISTENT_PAYMENTS) {
      return false;
    }

    // Extract day of month for each salary transaction
    const payDays = salaryTransactions.map((txn) => new Date(txn.date).getDate());

    // Count occurrences of each payday (with tolerance)
    const dayGroups = new Map<number, number>();

    for (const day of payDays) {
      // Find existing group within tolerance
      let foundGroup = false;
      for (const [groupDay, count] of dayGroups) {
        if (this.isWithinTolerance(day, groupDay)) {
          dayGroups.set(groupDay, count + 1);
          foundGroup = true;
          break;
        }
      }
      if (!foundGroup) {
        dayGroups.set(day, 1);
      }
    }

    // Check if any group has enough consistent payments
    for (const count of dayGroups.values()) {
      if (count >= MIN_CONSISTENT_PAYMENTS) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if two days are within the tolerance range (handles month boundaries)
   */
  private isWithinTolerance(day1: number, day2: number): boolean {
    const diff = Math.abs(day1 - day2);
    // Handle month boundary (e.g., day 1 and day 30 could be within tolerance)
    const wrappedDiff = Math.min(diff, 31 - diff);
    return wrappedDiff <= PAYDAY_TOLERANCE_DAYS;
  }

  /**
   * Calculate expense ratio (total debits / total credits)
   * Returns 0 if no credits
   */
  private calculateExpenseRatio(credits: MonoTransaction[], debits: MonoTransaction[]): number {
    const totalCredits = credits.reduce((sum, txn) => sum + txn.amount, 0);
    const totalDebits = debits.reduce((sum, txn) => sum + txn.amount, 0);

    if (totalCredits === 0) {
      return 0;
    }

    return Math.round((totalDebits / totalCredits) * 100) / 100;
  }
}
