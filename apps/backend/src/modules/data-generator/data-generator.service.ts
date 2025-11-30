import { Prisma } from '@prisma/client';
import { Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../../common/prisma/prisma.service';
import { GenerateDataDto } from './dto/generate-data.dto';

interface Distribution {
  type: string;
  params?: Record<string, number>;
}

@Injectable()
export class DataGeneratorService {
  constructor(private prisma: PrismaService) {}

  async generateTransactions(dto: GenerateDataDto) {
    const transactions = [];
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 6);

    for (let i = 0; i < dto.rows; i++) {
      const ts = this.generateTimestamp(startDate, new Date(), dto.seasonality);
      const amount = this.generateAmount(dto.distributions?.amount);
      const type = this.pickRandom(['payment', 'refund', 'transfer', 'deposit', 'withdrawal']);
      const paymentMethod = this.pickRandom(['credit_card', 'debit_card', 'pix', 'boleto', 'cash']);
      const status = this.generateStatus(dto.anomalies);
      const channel = this.pickRandom(['web', 'mobile', 'pos', 'api']);

      transactions.push({
        id: uuidv4(),
        ts,
        type,
        amount,
        paymentMethod,
        customerId: uuidv4(),
        contractId: Math.random() > 0.3 ? uuidv4() : null,
        status,
        channel,
        metadata: this.generateMetadata() as Prisma.InputJsonValue,
      });
    }

    // Inject anomalies if configured
    if (dto.anomalies?.enabled && dto.anomalies.count) {
      this.injectAnomalies(transactions, dto.anomalies.count, dto.anomalies.types || ['outlier']);
    }

    // Insert into database
    const result = await this.prisma.transaction.createMany({
      data: transactions,
    });

    return {
      generated_rows: result.count,
      preview_sample: transactions.slice(0, 10),
    };
  }

  async generateOperationalEvents(dto: GenerateDataDto) {
    const events = [];
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 3);

    for (let i = 0; i < dto.rows; i++) {
      const ts = this.generateTimestamp(startDate, new Date(), dto.seasonality);
      const operation = this.pickRandom([
        'customer_service_call',
        'ticket_created',
        'ticket_resolved',
        'chat_session',
        'email_response',
        'callback_scheduled',
      ]);
      const durationSec = this.generateDuration(dto.distributions?.duration);
      const slaHit = Math.random() > 0.15;
      const result = this.pickRandom(['success', 'partial', 'failed', 'escalated']);

      events.push({
        id: uuidv4(),
        operation,
        ts,
        durationSec,
        agent: `agent_${Math.floor(Math.random() * 50)}`,
        channel: this.pickRandom(['phone', 'chat', 'email', 'social']),
        slaHit,
        result,
        metadata: {} as Prisma.InputJsonValue,
      });
    }

    const dbResult = await this.prisma.operationalEvent.createMany({
      data: events,
    });

    return {
      generated_rows: dbResult.count,
      preview_sample: events.slice(0, 10),
    };
  }

  private generateTimestamp(start: Date, end: Date, seasonality?: boolean): Date {
    const range = end.getTime() - start.getTime();
    let timestamp = new Date(start.getTime() + Math.random() * range);

    if (seasonality) {
      // Add business hours bias
      const hour = timestamp.getHours();
      if (hour < 8 || hour > 20) {
        timestamp.setHours(8 + Math.floor(Math.random() * 12));
      }
      // Reduce weekend activity
      const day = timestamp.getDay();
      if (day === 0 || day === 6) {
        if (Math.random() > 0.3) {
          timestamp.setDate(timestamp.getDate() + (day === 0 ? 1 : 2));
        }
      }
    }

    return timestamp;
  }

  private generateAmount(distribution?: Distribution): number {
    const type = distribution?.type || 'normal';
    let amount: number;

    switch (type) {
      case 'uniform':
        const min = distribution?.params?.min || 10;
        const max = distribution?.params?.max || 1000;
        amount = min + Math.random() * (max - min);
        break;

      case 'exponential':
        const lambda = distribution?.params?.lambda || 0.01;
        amount = -Math.log(1 - Math.random()) / lambda;
        break;

      case 'normal':
      default:
        const mean = distribution?.params?.mean || 250;
        const stdDev = distribution?.params?.stdDev || 150;
        // Box-Muller transform
        const u1 = Math.random();
        const u2 = Math.random();
        const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
        amount = mean + z * stdDev;
        break;
    }

    return Math.max(0.01, Math.round(amount * 100) / 100);
  }

  private generateDuration(distribution?: Distribution): number {
    const mean = distribution?.params?.mean || 300;
    const stdDev = distribution?.params?.stdDev || 120;
    const u1 = Math.random();
    const u2 = Math.random();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return Math.max(30, Math.round(mean + z * stdDev));
  }

  private generateStatus(anomalies?: { enabled?: boolean }): string {
    const rand = Math.random();
    if (anomalies?.enabled && rand > 0.95) {
      return this.pickRandom(['failed', 'error', 'timeout', 'cancelled']);
    }
    if (rand > 0.85) return 'pending';
    if (rand > 0.80) return 'cancelled';
    return 'completed';
  }

  private generateMetadata(): Record<string, unknown> {
    return {
      source: 'simulator',
      generated_at: new Date().toISOString(),
      batch_id: uuidv4(),
    };
  }

  private pickRandom<T>(options: T[]): T {
    return options[Math.floor(Math.random() * options.length)]!;
  }

  private injectAnomalies(
    data: Array<Record<string, unknown>>,
    count: number,
    types: string[],
  ): void {
    for (let i = 0; i < count && i < data.length; i++) {
      const index = Math.floor(Math.random() * data.length);
      const anomalyType = this.pickRandom(types);
      const record = data[index]!;

      switch (anomalyType) {
        case 'outlier':
          if (record.amount) {
            record.amount = (record.amount as number) * (10 + Math.random() * 90);
          }
          break;
        case 'duplicate':
          data.push({ ...record, id: uuidv4() });
          break;
        case 'null_value':
          record.customerId = null;
          break;
        case 'invalid_status':
          record.status = 'INVALID_STATUS';
          break;
      }

      record.metadata = {
        ...(record.metadata as Record<string, unknown>),
        anomaly_injected: anomalyType,
      };
    }
  }
}
