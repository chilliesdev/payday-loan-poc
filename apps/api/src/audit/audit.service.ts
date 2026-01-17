import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(params: {
    actor: string;
    action: string;
    metadata?: Record<string, unknown>;
    companyId?: string | null;
    userId?: string | null;
  }) {
    return this.prisma.auditLog.create({
      data: {
        actor: params.actor,
        action: params.action,
        metadata: params.metadata as any,
        companyId: params.companyId ?? null,
        userId: params.userId ?? null
      }
    });
  }
}
