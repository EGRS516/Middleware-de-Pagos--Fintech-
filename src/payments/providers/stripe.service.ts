import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

@Injectable()
export class StripeProviderService {
  private readonly logger = new Logger(StripeProviderService.name);
  private readonly stripe: any;

  constructor(private readonly configService: ConfigService) {
    const secretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (!secretKey) {
      this.logger.warn('STRIPE_SECRET_KEY no está configurada');
    }
    this.stripe = new Stripe(secretKey || 'dummy_key', {
      apiVersion: '2024-04-10' as any, 
    });
  }

  async createPaymentIntent(amount: number, currency: string, paymentId: string): Promise<{ clientSecret: string, externalId: string }> {
    try {
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Stripe expects amounts in cents
        currency: currency.toLowerCase(),
        metadata: {
          internalPaymentId: paymentId,
        },
      });

      return {
        clientSecret: paymentIntent.client_secret,
        externalId: paymentIntent.id,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new InternalServerErrorException(`Stripe error: ${errorMessage}`);
    }
  }

  validateWebhookSignature(payload: Buffer, signature: string): any {
    const webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET');
    return this.stripe.webhooks.constructEvent(payload, signature, webhookSecret || '');
  }
}
