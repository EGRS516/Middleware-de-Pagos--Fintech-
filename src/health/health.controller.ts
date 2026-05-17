import { Controller, Get, Req, Res } from '@nestjs/common';
import { HealthCheckService, HealthCheck, MemoryHealthIndicator } from '@nestjs/terminus';
import { PrismaService } from '../prisma/prisma.service';
import * as express from 'express';
import * as net from 'net';
import { getHtmlDashboard } from './health-ui.template';

@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private prisma: PrismaService,
    private memory: MemoryHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  async check(@Req() req: express.Request, @Res() res: express.Response) {
    // Database Check
    let prismaStatus = 'up';
    let dbDuration = 0;
    const startDb = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      dbDuration = Date.now() - startDb;
    } catch (e) {
      prismaStatus = 'down';
    }

    // Memory Check
    let memoryStatus = 'up';
    const heapUsed = process.memoryUsage().heapUsed;
    const heapLimit = 150 * 1024 * 1024; // 150MB
    if (heapUsed > heapLimit) {
      memoryStatus = 'down';
    }

    // Redis Check
    const redisHost = process.env.REDIS_HOST || 'redis';
    const redisPort = parseInt(process.env.REDIS_PORT || '6379', 10);
    const redisStatus = await new Promise<'up' | 'down'>((resolve) => {
      const socket = new net.Socket();
      socket.setTimeout(1000);
      socket.once('connect', () => {
        socket.destroy();
        resolve('up');
      });
      socket.once('timeout', () => {
        socket.destroy();
        resolve('down');
      });
      socket.once('error', () => {
        socket.destroy();
        resolve('down');
      });
      socket.connect(redisPort, redisHost);
    });

    const isHealthy = prismaStatus === 'up' && memoryStatus === 'up' && redisStatus === 'up';

    const healthData = {
      status: isHealthy ? 'ok' : 'error',
      info: {
        prisma: { status: prismaStatus, durationMs: dbDuration },
        memory_heap: { status: memoryStatus, used: heapUsed, limit: heapLimit },
        redis: { status: redisStatus, host: redisHost, port: redisPort },
      },
      error: {},
      details: {
        prisma: { status: prismaStatus },
        memory_heap: { status: memoryStatus },
        redis: { status: redisStatus },
      },
    };

    const accept = req.headers['accept'] || '';
    if (accept.includes('text/html')) {
      res.setHeader('Content-Type', 'text/html');
      return res.send(getHtmlDashboard(healthData));
    }

    res.status(isHealthy ? 200 : 503).json(healthData);
  }
}
