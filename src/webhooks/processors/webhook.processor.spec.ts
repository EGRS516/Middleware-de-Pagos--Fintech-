import { Test, TestingModule } from '@nestjs/testing';
import { WebhookProcessor } from './webhook.processor';
import { PrismaService } from '../../prisma/prisma.service';
import { PaymentProvider, PaymentStatus } from '@prisma/client';
import { Job } from 'bullmq';

describe('WebhookProcessor', () => {
  let processor: WebhookProcessor;
  let prismaService: PrismaService;

  const mockPrismaService = {
    webhookLog: {
      create: jest.fn(),
      update: jest.fn(),
    },
    payment: {
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhookProcessor,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    processor = module.get<WebhookProcessor>(WebhookProcessor);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('process Stripe webhook', () => {
    it('should update payment status to COMPLETED on payment_intent.succeeded', async () => {
      const mockJob = {
        id: 'job-1',
        name: 'process-stripe',
        data: {
          event: {
            type: 'payment_intent.succeeded',
            data: {
              object: {
                metadata: { internalPaymentId: 'uuid-123' },
              },
            },
          },
        },
      } as unknown as Job;

      mockPrismaService.webhookLog.create.mockResolvedValue({ id: 'log-1', retryCount: 0 });

      await processor.process(mockJob);

      expect(prismaService.webhookLog.create).toHaveBeenCalledWith({
        data: {
          provider: PaymentProvider.STRIPE,
          payload: mockJob.data.event,
          eventType: 'payment_intent.succeeded',
        },
      });

      expect(prismaService.payment.update).toHaveBeenCalledWith({
        where: { id: 'uuid-123' },
        data: { status: PaymentStatus.COMPLETED },
      });

      expect(prismaService.webhookLog.update).toHaveBeenCalledWith({
        where: { id: 'log-1' },
        data: { processed: true, paymentId: 'uuid-123' },
      });
    });

    it('should handle missing internalPaymentId gracefully without throwing (just logs)', async () => {
      const mockJob = {
        id: 'job-2',
        name: 'process-stripe',
        data: {
          event: {
            type: 'payment_intent.succeeded',
            data: { object: { metadata: {} } }, // Missing ID
          },
        },
      } as unknown as Job;

      mockPrismaService.webhookLog.create.mockResolvedValue({ id: 'log-2', retryCount: 0 });

      await processor.process(mockJob);

      // Should not call payment update
      expect(prismaService.payment.update).not.toHaveBeenCalled();
    });
  });

  describe('process PayPal webhook', () => {
    it('should update payment status to COMPLETED on PAYMENT.CAPTURE.COMPLETED', async () => {
      const mockJob = {
        id: 'job-3',
        name: 'process-paypal',
        data: {
          body: {
            event_type: 'PAYMENT.CAPTURE.COMPLETED',
            resource: { custom_id: 'uuid-paypal-123' },
          },
        },
      } as unknown as Job;

      mockPrismaService.webhookLog.create.mockResolvedValue({ id: 'log-3', retryCount: 0 });

      await processor.process(mockJob);

      expect(prismaService.webhookLog.create).toHaveBeenCalledWith({
        data: {
          provider: PaymentProvider.PAYPAL,
          payload: mockJob.data.body,
          eventType: 'PAYMENT.CAPTURE.COMPLETED',
        },
      });

      expect(prismaService.payment.update).toHaveBeenCalledWith({
        where: { id: 'uuid-paypal-123' },
        data: { status: PaymentStatus.COMPLETED },
      });
    });
  });
});
