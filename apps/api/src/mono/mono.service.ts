import { Injectable, BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AuditService } from '../audit/audit.service';

const MONO_API_BASE_URL = 'https://api.withmono.com';

interface MonoExchangeResponse {
  id: string;
}

interface MonoTransaction {
  _id: string;
  type: string;
  amount: number;
  narration: string;
  date: string;
  balance: number;
}

interface MonoStatementResponse {
  data: MonoTransaction[];
}

@Injectable()
export class MonoService {
  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly audit: AuditService
  ) {}

  /**
   * Exchange a temporary code from Mono Connect widget for an account ID
   * @param code - Temporary code from Mono Connect widget
   * @returns Account ID string
   */
  async exchangeToken(code: string): Promise<string> {
    const secretKey = this.configService.get<string>('MONO_SECRET_KEY');

    if (!secretKey) {
      throw new Error('MONO_SECRET_KEY is not configured');
    }

    try {
      const response = await firstValueFrom(
        this.httpService.post<MonoExchangeResponse>(
          `${MONO_API_BASE_URL}/account/auth`,
          { code },
          {
            headers: {
              'mono-sec-key': secretKey,
              'Content-Type': 'application/json'
            }
          }
        )
      );

      const accountId = response.data.id;

      await this.audit.log({
        actor: 'system',
        action: 'MonoTokenExchanged',
        metadata: { accountId }
      });

      return accountId;
    } catch (error: any) {
      if (error.response?.status === 400 || error.response?.status === 401) {
        throw new BadRequestException('Invalid Mono code or credentials');
      }
      throw new ServiceUnavailableException('Failed to connect to Mono API');
    }
  }

  /**
   * Retrieve bank statement (transaction history) for an account
   * @param accountId - Mono account ID
   * @returns Array of transactions
   */
  async getStatement(accountId: string): Promise<MonoTransaction[]> {
    const secretKey = this.configService.get<string>('MONO_SECRET_KEY');

    if (!secretKey) {
      throw new Error('MONO_SECRET_KEY is not configured');
    }

    try {
      const response = await firstValueFrom(
        this.httpService.get<MonoStatementResponse>(
          `${MONO_API_BASE_URL}/accounts/${accountId}/statement`,
          {
            headers: {
              'mono-sec-key': secretKey
            }
          }
        )
      );

      await this.audit.log({
        actor: 'system',
        action: 'MonoStatementRetrieved',
        metadata: { accountId, transactionCount: response.data.data.length }
      });

      return response.data.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        throw new BadRequestException('Mono account not found');
      }
      throw new ServiceUnavailableException('Failed to retrieve statement from Mono API');
    }
  }
}
