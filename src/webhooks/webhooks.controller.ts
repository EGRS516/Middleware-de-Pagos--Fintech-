import { Controller, Post, Req, Res, Headers, Logger } from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request, Response } from 'express';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { StripeProviderService } from '../payments/providers/stripe.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Webhooks')
@Controller('webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(
    @InjectQueue('webhooks') private readonly webhooksQueue: Queue,
    private readonly stripeService: StripeProviderService,
  ) {}

  @Post('stripe')
  @ApiOperation({ summary: 'Stripe Webhook Endpoint' })
  async handleStripeWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
    @Res() res: Response,
  ) {
    try {
      if (!req.rawBody) {
        throw new Error('Raw body not available');
      }
      // Validate signature
      const event = this.stripeService.validateWebhookSignature(req.rawBody, signature);

      // Add to BullMQ queue for async processing
      await this.webhooksQueue.add(
        'process-stripe',
        { event },
        { attempts: 3, backoff: { type: 'exponential', delay: 1000 } }
      );

      res.status(200).send('Webhook received and queued');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      this.logger.error(`Stripe Webhook Error: ${errorMessage}`);
      res.status(400).send(`Webhook Error: ${errorMessage}`);
    }
  }

  @Post('paypal')
  @ApiOperation({ summary: 'PayPal Webhook Endpoint' })
  async handlePayPalWebhook(@Req() req: Request, @Res() res: Response) {
    // PayPal signature validation usually involves calling their API back
    // For simplicity, we queue the payload and validate in the worker,
    // or validate here if strictly required before queueing.
    try {
      await this.webhooksQueue.add(
        'process-paypal',
        { body: req.body, headers: req.headers },
        { attempts: 3, backoff: { type: 'exponential', delay: 1000 } }
      );
      this.logger.log('Webhook de PayPal recibido y encolado');

      res.status(200).send('Webhook received and queued');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      this.logger.error(`PayPal Webhook Error: ${errorMessage}`);
      res.status(400).send('Webhook Error');
    }
  }
}
