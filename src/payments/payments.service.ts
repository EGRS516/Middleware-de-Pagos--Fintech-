import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PrismaService } from '../prisma/prisma.service';
import { StripeProviderService } from './providers/stripe.service';
import { PayPalProviderService } from './providers/paypal.service';
import { PaymentProvider } from '@prisma/client';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stripeService: StripeProviderService,
    private readonly paypalService: PayPalProviderService,
  ) {}

  async createPayment(dto: CreatePaymentDto) {
    this.logger.log(
      `Creando pago: provider=${dto.provider}, amount=${dto.amount} ${dto.currency ?? 'USD'}`,
    );

    // 1. Crear el registro interno inicial
    const payment = await this.prisma.payment.create({
      data: {
        amount: dto.amount,
        currency: dto.currency || 'USD',
        provider: dto.provider,
        customerEmail: dto.customerEmail,
      },
    });
    this.logger.debug(`Registro interno creado con ID: ${payment.id}`);

    // 2. Comunicarse con el proveedor correspondiente
    let externalId = '';
    let clientSecret: string | undefined;

    if (dto.provider === PaymentProvider.STRIPE) {
      const stripeResponse = await this.stripeService.createPaymentIntent(
        dto.amount,
        payment.currency,
        payment.id,
      );
      externalId = stripeResponse.externalId;
      clientSecret = stripeResponse.clientSecret;
      this.logger.log(`PaymentIntent de Stripe creado: ${externalId}`);
    } else if (dto.provider === PaymentProvider.PAYPAL) {
      const paypalResponse = await this.paypalService.createOrder(
        dto.amount,
        payment.currency,
        payment.id,
      );
      externalId = paypalResponse.orderId;
      this.logger.log(`Orden de PayPal creada: ${externalId}`);
    }

    // 3. Actualizar el pago con el ID externo
    const updatedPayment = await this.prisma.payment.update({
      where: { id: payment.id },
      data: { externalId },
    });

    this.logger.log(`Pago ${payment.id} actualizado con externalId: ${externalId}`);

    return {
      paymentId: updatedPayment.id,
      status: updatedPayment.status,
      provider: updatedPayment.provider,
      externalId,
      ...(clientSecret && { clientSecret }), // Necesario para Stripe en el frontend
    };
  }

  async findOne(id: string) {
    this.logger.debug(`Buscando pago con ID: ${id}`);
    const payment = await this.prisma.payment.findUnique({
      where: { id },
      include: { webhookLogs: true },
    });
    if (!payment) {
      this.logger.warn(`Pago no encontrado: ${id}`);
      throw new NotFoundException(`Pago con ID ${id} no encontrado`);
    }
    return payment;
  }
}