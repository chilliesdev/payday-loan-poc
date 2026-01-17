import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { SignupDto } from './dto/signup.dto';
import { getDomainFromEmail, normalizeDomain } from '../common/validation';

const VERIFICATION_TTL_HOURS = 24;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService
  ) {}

  async signup(dto: SignupDto) {
    const email = dto.email.trim().toLowerCase();
    const domain = normalizeDomain(getDomainFromEmail(email));

    if (!domain) {
      throw new BadRequestException('Invalid email address.');
    }

    const company = await this.prisma.company.findUnique({
      where: { emailDomain: domain }
    });

    if (!company) {
      throw new BadRequestException('Company domain not recognized.');
    }

    const existingUser = await this.prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      throw new ConflictException('User already exists.');
    }

    const user = await this.prisma.user.create({
      data: {
        email,
        companyId: company.id
      }
    });

    const token = randomBytes(24).toString('hex');
    const expiresAt = new Date(Date.now() + VERIFICATION_TTL_HOURS * 60 * 60 * 1000);

    await this.prisma.verificationToken.create({
      data: {
        userId: user.id,
        token,
        expiresAt
      }
    });

    await this.audit.log({
      actor: email,
      action: 'UserSignedUp',
      userId: user.id,
      companyId: company.id,
      metadata: { email }
    });

    return {
      userId: user.id,
      email: user.email,
      verificationToken: token,
      verificationExpiresAt: expiresAt
    };
  }

  async verifyEmail(token: string) {
    const record = await this.prisma.verificationToken.findUnique({
      where: { token },
      include: { user: true }
    });

    if (!record) {
      throw new NotFoundException('Verification token not found.');
    }

    if (record.verifiedAt) {
      throw new BadRequestException('Token already used.');
    }

    if (record.expiresAt < new Date()) {
      throw new BadRequestException('Token expired.');
    }

    const user = await this.prisma.user.update({
      where: { id: record.userId },
      data: { emailVerifiedAt: new Date() }
    });

    await this.prisma.verificationToken.update({
      where: { id: record.id },
      data: { verifiedAt: new Date() }
    });

    await this.audit.log({
      actor: user.email,
      action: 'UserEmailVerified',
      userId: user.id,
      companyId: user.companyId,
      metadata: { token }
    });

    return { verified: true };
  }
}
