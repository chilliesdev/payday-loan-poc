import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { MonoService } from '../mono/mono.service';
import { AffordabilityService } from '../scoring/affordability.service';

export interface LinkBankAccountResult {
  accountId: string;
  maxLoanAmount: number;
  averageSalary: number;
  paydayDetected: boolean;
  expenseRatio: number;
}

@Injectable()
export class FinancialService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly monoService: MonoService,
    private readonly affordabilityService: AffordabilityService
  ) {}

  /**
   * Exchange Mono code, fetch statement, calculate affordability, and save to user
   * @param userId - User ID to link the bank account to
   * @param code - Mono Connect widget code
   * @returns Calculated loan limit and financial data
   */
  async linkBankAccount(userId: string, code: string): Promise<LinkBankAccountResult> {
    // Verify user exists
    const user = await this.prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Step 1: Exchange code for account ID
    const accountId = await this.monoService.exchangeToken(code);

    // Step 2: Get bank statement (transactions)
    const transactions = await this.monoService.getStatement(accountId);

    // Step 3: Calculate affordability
    const affordability = this.affordabilityService.calculateAffordability(transactions);

    // Step 4: Save financial snapshot
    await this.prisma.financialSnapshot.create({
      data: {
        userId,
        averageSalary: affordability.averageSalary,
        paydayDetected: affordability.paydayDetected,
        expenseRatio: affordability.expenseRatio,
        rawStatementData: transactions as any
      }
    });

    // Step 5: Update user with account ID and loan limit
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        monoAccountId: accountId,
        maxLoanAmount: affordability.maxLoanAmount
      }
    });

    // Step 6: Log audit events
    await this.audit.log({
      actor: user.email,
      action: 'FinancialDataLinked',
      userId,
      companyId: user.companyId,
      metadata: { accountId }
    });

    await this.audit.log({
      actor: user.email,
      action: 'LoanLimitCalculated',
      userId,
      companyId: user.companyId,
      metadata: {
        maxLoanAmount: affordability.maxLoanAmount,
        averageSalary: affordability.averageSalary,
        paydayDetected: affordability.paydayDetected
      }
    });

    return {
      accountId,
      maxLoanAmount: affordability.maxLoanAmount,
      averageSalary: affordability.averageSalary,
      paydayDetected: affordability.paydayDetected,
      expenseRatio: affordability.expenseRatio
    };
  }

  /**
   * Get the loan limit for a user by email
   * @param email - User email address
   * @returns User's max loan amount or null if not calculated
   */
  async getLoanLimit(
    email: string
  ): Promise<{ maxLoanAmount: number | null; hasLinkedAccount: boolean }> {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: {
        maxLoanAmount: true,
        monoAccountId: true
      }
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      maxLoanAmount: user.maxLoanAmount,
      hasLinkedAccount: !!user.monoAccountId
    };
  }

  /**
   * Get the loan limit for a user by ID
   * @param userId - User ID
   * @returns User's max loan amount or null if not calculated
   */
  async getLoanLimitById(
    userId: string
  ): Promise<{ maxLoanAmount: number | null; hasLinkedAccount: boolean }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        maxLoanAmount: true,
        monoAccountId: true
      }
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      maxLoanAmount: user.maxLoanAmount,
      hasLinkedAccount: !!user.monoAccountId
    };
  }
}
