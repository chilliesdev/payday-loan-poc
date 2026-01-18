import { Module } from '@nestjs/common';
import { FinancialController } from './financial.controller';
import { FinancialService } from './financial.service';
import { MonoModule } from '../mono/mono.module';
import { ScoringModule } from '../scoring/scoring.module';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

@Module({
  imports: [MonoModule, ScoringModule],
  controllers: [FinancialController],
  providers: [FinancialService, PrismaService, AuditService],
  exports: [FinancialService]
})
export class FinancialModule {}
