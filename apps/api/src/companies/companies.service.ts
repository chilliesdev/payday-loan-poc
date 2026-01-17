import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { isValidDomain, isValidPaydayDay, normalizeDomain } from '../common/validation';

@Injectable()
export class CompaniesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService
  ) {}

  async createCompany(dto: CreateCompanyDto) {
    const domain = normalizeDomain(dto.emailDomain);

    if (!isValidDomain(domain)) {
      throw new BadRequestException('Invalid email domain format.');
    }

    if (!isValidPaydayDay(dto.paydayDay)) {
      throw new BadRequestException('Payday day must be between 1 and 28.');
    }

    const existing = await this.prisma.company.findUnique({
      where: { emailDomain: domain }
    });

    if (existing) {
      throw new ConflictException('Company domain already exists.');
    }

    const company = await this.prisma.company.create({
      data: {
        name: dto.name.trim(),
        emailDomain: domain,
        paydayDay: dto.paydayDay
      }
    });

    await this.audit.log({
      actor: 'admin',
      action: 'CompanyCreated',
      companyId: company.id,
      metadata: { emailDomain: domain }
    });

    return company;
  }
}
