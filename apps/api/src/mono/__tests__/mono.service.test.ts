import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { AxiosResponse, AxiosError } from 'axios';
import { MonoService } from '../mono.service';

describe('MonoService', () => {
  let service: MonoService;
  let mockHttpPost: any;
  let mockHttpGet: any;
  let mockConfigGet: any;
  let mockAuditLog: any;

  beforeEach(() => {
    mockHttpPost = vi.fn();
    mockHttpGet = vi.fn();
    mockConfigGet = vi.fn().mockReturnValue('test_secret_key');
    mockAuditLog = vi.fn();

    const mockHttpService = {
      post: mockHttpPost,
      get: mockHttpGet
    } as any;

    const mockConfigService = {
      get: mockConfigGet
    } as any;

    const mockAuditService = {
      log: mockAuditLog
    } as any;

    service = new MonoService(mockHttpService, mockConfigService, mockAuditService);
  });

  describe('exchangeToken', () => {
    it('should successfully exchange a valid code for an account ID', async () => {
      const mockCode = 'code_test123';
      const mockAccountId = 'acc_1234567890';
      const mockResponse: AxiosResponse = {
        data: { id: mockAccountId },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any
      };

      mockHttpPost.mockReturnValue(of(mockResponse));

      const result = await service.exchangeToken(mockCode);

      expect(result).toBe(mockAccountId);
      expect(mockHttpPost).toHaveBeenCalledWith(
        'https://api.withmono.com/account/auth',
        { code: mockCode },
        {
          headers: {
            'mono-sec-key': 'test_secret_key',
            'Content-Type': 'application/json'
          }
        }
      );
      expect(mockAuditLog).toHaveBeenCalledWith({
        actor: 'system',
        action: 'MonoTokenExchanged',
        metadata: { accountId: mockAccountId }
      });
    });

    it('should throw BadRequestException for invalid code (400 response)', async () => {
      const mockCode = 'invalid_code';
      const mockError = {
        response: { status: 400 }
      } as AxiosError;

      mockHttpPost.mockReturnValue(throwError(() => mockError));

      await expect(service.exchangeToken(mockCode)).rejects.toThrow(BadRequestException);
      await expect(service.exchangeToken(mockCode)).rejects.toThrow(
        'Invalid Mono code or credentials'
      );
    });

    it('should throw BadRequestException for unauthorized (401 response)', async () => {
      const mockCode = 'code_test123';
      const mockError = {
        response: { status: 401 }
      } as AxiosError;

      mockHttpPost.mockReturnValue(throwError(() => mockError));

      await expect(service.exchangeToken(mockCode)).rejects.toThrow(BadRequestException);
    });

    it('should throw ServiceUnavailableException for network errors', async () => {
      const mockCode = 'code_test123';
      const mockError = {
        response: { status: 500 }
      } as AxiosError;

      mockHttpPost.mockReturnValue(throwError(() => mockError));

      await expect(service.exchangeToken(mockCode)).rejects.toThrow(ServiceUnavailableException);
      await expect(service.exchangeToken(mockCode)).rejects.toThrow(
        'Failed to connect to Mono API'
      );
    });

    it('should throw error if MONO_SECRET_KEY is not configured', async () => {
      mockConfigGet.mockReturnValueOnce(undefined);

      await expect(service.exchangeToken('code_test')).rejects.toThrow(
        'MONO_SECRET_KEY is not configured'
      );
    });
  });

  describe('getStatement', () => {
    it('should successfully retrieve statement for valid account ID', async () => {
      const mockAccountId = 'acc_1234567890';
      const mockTransactions = [
        {
          _id: 'txn_1',
          type: 'credit',
          amount: 50000,
          narration: 'SALARY PAYMENT',
          date: '2026-01-15',
          balance: 50000
        },
        {
          _id: 'txn_2',
          type: 'debit',
          amount: 5000,
          narration: 'ATM WITHDRAWAL',
          date: '2026-01-16',
          balance: 45000
        }
      ];
      const mockResponse: AxiosResponse = {
        data: { data: mockTransactions },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any
      };

      mockHttpGet.mockReturnValue(of(mockResponse));

      const result = await service.getStatement(mockAccountId);

      expect(result).toEqual(mockTransactions);
      expect(mockHttpGet).toHaveBeenCalledWith(
        `https://api.withmono.com/accounts/${mockAccountId}/statement`,
        {
          headers: {
            'mono-sec-key': 'test_secret_key'
          }
        }
      );
      expect(mockAuditLog).toHaveBeenCalledWith({
        actor: 'system',
        action: 'MonoStatementRetrieved',
        metadata: { accountId: mockAccountId, transactionCount: 2 }
      });
    });

    it('should throw BadRequestException for non-existent account (404 response)', async () => {
      const mockAccountId = 'acc_nonexistent';
      const mockError = {
        response: { status: 404 }
      } as AxiosError;

      mockHttpGet.mockReturnValue(throwError(() => mockError));

      await expect(service.getStatement(mockAccountId)).rejects.toThrow(BadRequestException);
      await expect(service.getStatement(mockAccountId)).rejects.toThrow('Mono account not found');
    });

    it('should throw ServiceUnavailableException for server errors', async () => {
      const mockAccountId = 'acc_1234567890';
      const mockError = {
        response: { status: 503 }
      } as AxiosError;

      mockHttpGet.mockReturnValue(throwError(() => mockError));

      await expect(service.getStatement(mockAccountId)).rejects.toThrow(
        ServiceUnavailableException
      );
      await expect(service.getStatement(mockAccountId)).rejects.toThrow(
        'Failed to retrieve statement from Mono API'
      );
    });

    it('should throw error if MONO_SECRET_KEY is not configured', async () => {
      mockConfigGet.mockReturnValueOnce(undefined);

      await expect(service.getStatement('acc_test')).rejects.toThrow(
        'MONO_SECRET_KEY is not configured'
      );
    });
  });
});
