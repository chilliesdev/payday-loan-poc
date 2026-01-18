import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { MonoService } from './mono.service';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  imports: [HttpModule],
  providers: [MonoService, AuditService, PrismaService],
  exports: [MonoService]
})
export class MonoModule {}
