import { Controller, Get } from '@nestjs/common';
import { HealthCheckService, HealthCheck, HealthCheckResult, MemoryHealthIndicator } from '@nestjs/terminus';
import { PrismaService } from '../prisma/prisma.service';

@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private prisma: PrismaService,
    private memory: MemoryHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  check(): Promise<HealthCheckResult> {
    return this.health.check([
      () => this.prisma.$queryRaw`SELECT 1`.then(() => ({ prisma: { status: 'up' } })),
      () => this.memory.checkHeap('memory_heap', 150 * 1024 * 1024),
    ]);
  }
}
