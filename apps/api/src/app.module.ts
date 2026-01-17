import { Module } from '@nestjs/common';
import { HealthController } from './health/health.controller';
import { CompaniesController } from './companies/companies.controller';
import { CompaniesService } from './companies/companies.service';
import { PrismaService } from './prisma/prisma.service';
import { AuthController } from './auth/auth.controller';
import { AuthService } from './auth/auth.service';
import { AuditService } from './audit/audit.service';

@Module({
  imports: [],
  controllers: [HealthController, CompaniesController, AuthController],
  providers: [PrismaService, CompaniesService, AuthService, AuditService]
})
export class AppModule {}
