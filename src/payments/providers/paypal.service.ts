import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as paypal from '@paypal/paypal-server-sdk';

@Injectable()
export class PayPalProviderService {
  private readonly logger = new Logger(PayPalProviderService.name);
  private readonly client: paypal.Client;

  constructor(private readonly configService: ConfigService) {
    const clientId = this.configService.get<string>('PAYPAL_CLIENT_ID') || 'dummy_client';
    const clientSecret = this.configService.get<string>('PAYPAL_CLIENT_SECRET') || 'dummy_secret';
    const environment = this.configService.get<string>('PAYPAL_ENVIRONMENT') === 'live'
      ? paypal.Environment.Production
      : paypal.Environment.Sandbox;

    this.client = new paypal.Client({
      clientCredentialsAuthCredentials: {
        oAuthClientId: clientId,
        oAuthClientSecret: clientSecret,
      },
      timeout: 0,
      environment,
      logging: {
        logLevel: paypal.LogLevel.Info,
        logRequest: { logBody: true },
        logResponse: { logHeaders: true },
      },
    });
  }

  async createOrder(amount: number, currency: string, paymentId: string): Promise<{ orderId: string }> {
    try {
      const ordersController = new paypal.OrdersController(this.client);
      const requestParams = {
        body: {
          intent: 'CAPTURE',
          purchaseUnits: [
            {
              amount: {
                currencyCode: currency.toUpperCase(),
                value: amount.toFixed(2),
              },
              customId: paymentId,
            },
          ],
        } as paypal.OrderRequest,
      };

      const { result } = await ordersController.createOrder(requestParams);

      return { orderId: result.id as string };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
      this.logger.error(`PayPal Service Error: ${errorMessage}`, error instanceof Error ? error.stack : undefined);
      throw new InternalServerErrorException(`PayPal error: ${errorMessage}`);
    }
  }
}
