import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { FinancialService } from '../financial.service';

describe('FinancialService', () => {
  let service: FinancialService;
  let mockPrismaFindUnique: any;
  let mockPrismaUserUpdate: any;
  let mockPrismaFinancialSnapshotCreate: any;
  let mockAuditLog: any;
  let mockMonoExchangeToken: any;
  let mockMonoGetStatement: any;
  let mockCalculateAffordability: any;

  const mockUser = {
    id: 'user_123',
    email: 'john@testcompany.com',
    companyId: 'company_456',
    monoAccountId: null,
    maxLoanAmount: null
  };

  const mockTransactions = [
    {
      _id: 'txn_1',
      type: 'credit',
      amount: 300000,
      narration: 'SALARY PAYMENT DEC',
      date: '2025-12-25',
      balance: 300000
    },
    {
      _id: 'txn_2',
      type: 'credit',
      amount: 300000,
      narration: 'SALARY PAYMENT NOV',
      date: '2025-11-25',
      balance: 250000
    },
    {
      _id: 'txn_3',
      type: 'debit',
      amount: 50000,
      narration: 'RENT PAYMENT',
      date: '2025-12-01',
      balance: 250000
    }
  ];

  const mockAffordabilityResult = {
    averageSalary: 300000,
    paydayDetected: true,
    maxLoanAmount: 99000,
    expenseRatio: 0.17,
    salaryTransactionsCount: 2
  };

  beforeEach(() => {
    mockPrismaFindUnique = vi.fn();
    mockPrismaUserUpdate = vi.fn();
    mockPrismaFinancialSnapshotCreate = vi.fn();
    mockAuditLog = vi.fn();
    mockMonoExchangeToken = vi.fn();
    mockMonoGetStatement = vi.fn();
    mockCalculateAffordability = vi.fn();

    const mockPrismaService = {
      user: {
        findUnique: mockPrismaFindUnique,
        update: mockPrismaUserUpdate
      },
      financialSnapshot: {
        create: mockPrismaFinancialSnapshotCreate
      }
    } as any;

    const mockAuditService = {
      log: mockAuditLog
    } as any;

    const mockMonoService = {
      exchangeToken: mockMonoExchangeToken,
      getStatement: mockMonoGetStatement
    } as any;

    const mockAffordabilityService = {
      calculateAffordability: mockCalculateAffordability
    } as any;

    service = new FinancialService(
      mockPrismaService,
      mockAuditService,
      mockMonoService,
      mockAffordabilityService
    );
  });

  describe('linkBankAccount', () => {
    it('should successfully link a bank account and calculate loan limit', async () => {
      const mockCode = 'code_test123';
      const mockAccountId = 'acc_1234567890';

      mockPrismaFindUnique.mockResolvedValue(mockUser);
      mockMonoExchangeToken.mockResolvedValue(mockAccountId);
      mockMonoGetStatement.mockResolvedValue(mockTransactions);
      mockCalculateAffordability.mockReturnValue(mockAffordabilityResult);
      mockPrismaFinancialSnapshotCreate.mockResolvedValue({});
      mockPrismaUserUpdate.mockResolvedValue({});
      mockAuditLog.mockResolvedValue({});

      const result = await service.linkBankAccount(mockUser.id, mockCode);

      expect(result).toEqual({
        accountId: mockAccountId,
        maxLoanAmount: 99000,
        averageSalary: 300000,
        paydayDetected: true,
        expenseRatio: 0.17
      });

      // Verify Mono service calls
      expect(mockMonoExchangeToken).toHaveBeenCalledWith(mockCode);
      expect(mockMonoGetStatement).toHaveBeenCalledWith(mockAccountId);

      // Verify affordability calculation
      expect(mockCalculateAffordability).toHaveBeenCalledWith(mockTransactions);

      // Verify financial snapshot was created
      expect(mockPrismaFinancialSnapshotCreate).toHaveBeenCalledWith({
        data: {
          userId: mockUser.id,
          averageSalary: 300000,
          paydayDetected: true,
          expenseRatio: 0.17,
          rawStatementData: mockTransactions
        }
      });

      // Verify user was updated
      expect(mockPrismaUserUpdate).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: {
          monoAccountId: mockAccountId,
          maxLoanAmount: 99000
        }
      });

      // Verify audit logs
      expect(mockAuditLog).toHaveBeenCalledTimes(2);
      expect(mockAuditLog).toHaveBeenCalledWith({
        actor: mockUser.email,
        action: 'FinancialDataLinked',
        userId: mockUser.id,
        companyId: mockUser.companyId,
        metadata: { accountId: mockAccountId }
      });
      expect(mockAuditLog).toHaveBeenCalledWith({
        actor: mockUser.email,
        action: 'LoanLimitCalculated',
        userId: mockUser.id,
        companyId: mockUser.companyId,
        metadata: {
          maxLoanAmount: 99000,
          averageSalary: 300000,
          paydayDetected: true
        }
      });
    });

    it('should throw NotFoundException if user does not exist', async () => {
      mockPrismaFindUnique.mockResolvedValue(null);

      await expect(service.linkBankAccount('nonexistent_user', 'code_test')).rejects.toThrow(
        NotFoundException
      );
      await expect(service.linkBankAccount('nonexistent_user', 'code_test')).rejects.toThrow(
        'User not found'
      );

      // Ensure no further calls were made
      expect(mockMonoExchangeToken).not.toHaveBeenCalled();
    });

    it('should handle zero loan amount when no salary detected', async () => {
      const noSalaryResult = {
        averageSalary: 0,
        paydayDetected: false,
        maxLoanAmount: 0,
        expenseRatio: 0,
        salaryTransactionsCount: 0
      };

      mockPrismaFindUnique.mockResolvedValue(mockUser);
      mockMonoExchangeToken.mockResolvedValue('acc_123');
      mockMonoGetStatement.mockResolvedValue([]);
      mockCalculateAffordability.mockReturnValue(noSalaryResult);
      mockPrismaFinancialSnapshotCreate.mockResolvedValue({});
      mockPrismaUserUpdate.mockResolvedValue({});
      mockAuditLog.mockResolvedValue({});

      const result = await service.linkBankAccount(mockUser.id, 'code_test');

      expect(result.maxLoanAmount).toBe(0);
      expect(result.averageSalary).toBe(0);
      expect(result.paydayDetected).toBe(false);
    });
  });

  describe('getLoanLimit', () => {
    it('should return loan limit for existing user with linked account', async () => {
      mockPrismaFindUnique.mockResolvedValue({
        maxLoanAmount: 99000,
        monoAccountId: 'acc_123'
      });

      const result = await service.getLoanLimit('john@testcompany.com');

      expect(result).toEqual({
        maxLoanAmount: 99000,
        hasLinkedAccount: true
      });
      expect(mockPrismaFindUnique).toHaveBeenCalledWith({
        where: { email: 'john@testcompany.com' },
        select: {
          maxLoanAmount: true,
          monoAccountId: true
        }
      });
    });

    it('should return null loan limit for user without linked account', async () => {
      mockPrismaFindUnique.mockResolvedValue({
        maxLoanAmount: null,
        monoAccountId: null
      });

      const result = await service.getLoanLimit('new@testcompany.com');

      expect(result).toEqual({
        maxLoanAmount: null,
        hasLinkedAccount: false
      });
    });

    it('should normalize email to lowercase', async () => {
      mockPrismaFindUnique.mockResolvedValue({
        maxLoanAmount: 50000,
        monoAccountId: 'acc_456'
      });

      await service.getLoanLimit('JOHN@TESTCOMPANY.COM');

      expect(mockPrismaFindUnique).toHaveBeenCalledWith({
        where: { email: 'john@testcompany.com' },
        select: {
          maxLoanAmount: true,
          monoAccountId: true
        }
      });
    });

    it('should throw NotFoundException if user does not exist', async () => {
      mockPrismaFindUnique.mockResolvedValue(null);

      await expect(service.getLoanLimit('nonexistent@test.com')).rejects.toThrow(NotFoundException);
      await expect(service.getLoanLimit('nonexistent@test.com')).rejects.toThrow('User not found');
    });
  });

  describe('getLoanLimitById', () => {
    it('should return loan limit for existing user by ID', async () => {
      mockPrismaFindUnique.mockResolvedValue({
        maxLoanAmount: 75000,
        monoAccountId: 'acc_789'
      });

      const result = await service.getLoanLimitById('user_123');

      expect(result).toEqual({
        maxLoanAmount: 75000,
        hasLinkedAccount: true
      });
      expect(mockPrismaFindUnique).toHaveBeenCalledWith({
        where: { id: 'user_123' },
        select: {
          maxLoanAmount: true,
          monoAccountId: true
        }
      });
    });

    it('should throw NotFoundException if user ID does not exist', async () => {
      mockPrismaFindUnique.mockResolvedValue(null);

      await expect(service.getLoanLimitById('nonexistent_id')).rejects.toThrow(NotFoundException);
      await expect(service.getLoanLimitById('nonexistent_id')).rejects.toThrow('User not found');
    });
  });
});
