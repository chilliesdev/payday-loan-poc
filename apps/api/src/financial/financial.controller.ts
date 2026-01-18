import { Controller, Post, Get, Body, Query, ValidationPipe } from '@nestjs/common';
import { FinancialService } from './financial.service';
import { ExchangeTokenDto } from './dto/exchange-token.dto';
import { GetLimitDto } from './dto/get-limit.dto';

@Controller('api')
export class FinancialController {
  constructor(private readonly financialService: FinancialService) {}

  /**
   * Exchange Mono Connect code for account ID and calculate loan limit
   * POST /api/financial/mono/exchange
   */
  @Post('financial/mono/exchange')
  async exchangeMonoToken(
    @Body(new ValidationPipe({ whitelist: true })) dto: ExchangeTokenDto,
    @Query('userId') userId: string
  ) {
    const result = await this.financialService.linkBankAccount(userId, dto.code);
    return {
      success: true,
      data: result
    };
  }

  /**
   * Get user's loan limit by email
   * GET /api/users/me/limit
   */
  @Get('users/me/limit')
  async getUserLimit(@Query(new ValidationPipe({ whitelist: true })) dto: GetLimitDto) {
    const result = await this.financialService.getLoanLimit(dto.email);
    return {
      success: true,
      data: result
    };
  }
}
