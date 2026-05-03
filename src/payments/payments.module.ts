import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { StripeProviderService } from './providers/stripe.service';
import { PayPalProviderService } from './providers/paypal.service';

@Module({
  controllers: [PaymentsController],
  providers: [PaymentsService, StripeProviderService, PayPalProviderService],
  exports: [PaymentsService, StripeProviderService],
})
export class PaymentsModule {}
