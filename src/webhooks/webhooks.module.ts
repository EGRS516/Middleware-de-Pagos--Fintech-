import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { WebhooksController } from './webhooks.controller';
import { WebhookProcessor } from './processors/webhook.processor';
import { PaymentsModule } from '../payments/payments.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'webhooks',
    }),
    PaymentsModule, // Para inyectar StripeProviderService en el controlador
  ],
  controllers: [WebhooksController],
  providers: [WebhookProcessor],
})
export class WebhooksModule {}
