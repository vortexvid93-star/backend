import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';

@Injectable()
export class AppService {
  constructor(private readonly prisma: PrismaService) {}

  getHello(): string {
    return 'Hello World!';
  }

  async getHealth() {
    const started = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        status: 'ok',
        database: 'up',
        response_time_ms: Date.now() - started,
      };
    } catch {
      return {
        status: 'degraded',
        database: 'down',
        response_time_ms: Date.now() - started,
      };
    }
  }
}
