import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthController } from './health/health.controller';
import { CompaniesController } from './companies/companies.controller';
import { CompaniesService } from './companies/companies.service';
import { PrismaService } from './prisma/prisma.service';
import { AuthController } from './auth/auth.controller';
import { AuthService } from './auth/auth.service';
import { AuditService } from './audit/audit.service';
import { MonoModule } from './mono/mono.module';
import { ScoringModule } from './scoring/scoring.module';
import { FinancialModule } from './financial/financial.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '../../.env'
    }),
    MonoModule,
    ScoringModule,
    FinancialModule
  ],
  controllers: [HealthController, CompaniesController, AuthController],
  providers: [PrismaService, CompaniesService, AuthService, AuditService]
})
export class AppModule {}
