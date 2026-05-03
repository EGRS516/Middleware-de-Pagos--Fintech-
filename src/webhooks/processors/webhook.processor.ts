import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { PaymentProvider, PaymentStatus } from '@prisma/client';
import { Logger } from '@nestjs/common';

@Processor('webhooks')
export class WebhookProcessor extends WorkerHost {
  private readonly logger = new Logger(WebhookProcessor.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    this.logger.log(`Procesando trabajo ${job.id} de tipo ${job.name}`);

    if (job.name === 'process-stripe') {
      await this.processStripe(job.data.event);
    } else if (job.name === 'process-paypal') {
      await this.processPayPal(job.data.body);
    }
  }

  private async processStripe(event: any) {
    // Log the webhook in DB
    const log = await this.prisma.webhookLog.create({
      data: {
        provider: PaymentProvider.STRIPE,
        payload: event,
        eventType: event.type,
      },
    });

    try {
      if (event.type === 'payment_intent.succeeded') {
        const paymentIntent = event.data.object;
        const internalPaymentId = paymentIntent.metadata?.internalPaymentId;

        if (internalPaymentId) {
          await this.prisma.payment.update({
            where: { id: internalPaymentId },
            data: { status: PaymentStatus.COMPLETED },
          });
          
          await this.prisma.webhookLog.update({
            where: { id: log.id },
            data: { processed: true, paymentId: internalPaymentId },
          });
        }
      } else if (event.type === 'payment_intent.payment_failed') {
        const paymentIntent = event.data.object;
        const internalPaymentId = paymentIntent.metadata?.internalPaymentId;

        if (internalPaymentId) {
          await this.prisma.payment.update({
            where: { id: internalPaymentId },
            data: { status: PaymentStatus.FAILED },
          });
          
          await this.prisma.webhookLog.update({
            where: { id: log.id },
            data: { processed: true, paymentId: internalPaymentId },
          });
        }
      }
      // Handle other events as needed
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error procesando webhook de Stripe: ${errorMessage}`);
      await this.prisma.webhookLog.update({
        where: { id: log.id },
        data: { error: errorMessage, retryCount: log.retryCount + 1 },
      });
      throw error; // Re-throw to let BullMQ retry
    }
  }

  private async processPayPal(body: any) {
    // Logic for processing PayPal webhooks (e.g., PAYMENT.CAPTURE.COMPLETED)
    const log = await this.prisma.webhookLog.create({
      data: {
        provider: PaymentProvider.PAYPAL,
        payload: body,
        eventType: body.event_type,
      },
    });

    try {
      if (body.event_type === 'PAYMENT.CAPTURE.COMPLETED') {
        const resource = body.resource;
        const internalPaymentId = resource.custom_id;

        if (internalPaymentId) {
          await this.prisma.payment.update({
            where: { id: internalPaymentId },
            data: { status: PaymentStatus.COMPLETED },
          });

          await this.prisma.webhookLog.update({
            where: { id: log.id },
            data: { processed: true, paymentId: internalPaymentId },
          });
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error procesando webhook de PayPal: ${errorMessage}`);
      await this.prisma.webhookLog.update({
        where: { id: log.id },
        data: { error: errorMessage, retryCount: log.retryCount + 1 },
      });
      throw error;
    }
  }
}
