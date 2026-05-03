import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsService } from './payments.service';
import { PrismaService } from '../prisma/prisma.service';
import { StripeProviderService } from './providers/stripe.service';
import { PayPalProviderService } from './providers/paypal.service';
import { PaymentProvider, PaymentStatus } from '@prisma/client';

describe('PaymentsService', () => {
  let service: PaymentsService;
  let prismaService: PrismaService;
  let stripeService: StripeProviderService;
  let paypalService: PayPalProviderService;

  const mockPrismaService = {
    payment: {
      create: jest.fn(),
      update: jest.fn(),
      findUnique: jest.fn(),
    },
  };

  const mockStripeService = {
    createPaymentIntent: jest.fn(),
  };

  const mockPayPalService = {
    createOrder: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: StripeProviderService, useValue: mockStripeService },
        { provide: PayPalProviderService, useValue: mockPayPalService },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
    prismaService = module.get<PrismaService>(PrismaService);
    stripeService = module.get<StripeProviderService>(StripeProviderService);
    paypalService = module.get<PayPalProviderService>(PayPalProviderService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createPayment', () => {
    it('should create a Stripe payment intent and update DB', async () => {
      const dto = { amount: 100, currency: 'USD', provider: PaymentProvider.STRIPE };
      const internalPayment = { id: 'uuid-123', amount: 100, currency: 'USD', status: PaymentStatus.PENDING, provider: PaymentProvider.STRIPE };
      
      mockPrismaService.payment.create.mockResolvedValue(internalPayment);
      mockStripeService.createPaymentIntent.mockResolvedValue({
        clientSecret: 'secret_123',
        externalId: 'pi_123',
      });
      mockPrismaService.payment.update.mockResolvedValue({
        ...internalPayment,
        externalId: 'pi_123',
      });

      const result = await service.createPayment(dto);

      expect(prismaService.payment.create).toHaveBeenCalledWith({
        data: { amount: 100, currency: 'USD', provider: PaymentProvider.STRIPE, customerEmail: undefined },
      });
      expect(stripeService.createPaymentIntent).toHaveBeenCalledWith(100, 'USD', 'uuid-123');
      expect(prismaService.payment.update).toHaveBeenCalledWith({
        where: { id: 'uuid-123' },
        data: { externalId: 'pi_123' },
      });
      expect(result).toEqual({
        paymentId: 'uuid-123',
        status: PaymentStatus.PENDING,
        provider: PaymentProvider.STRIPE,
        externalId: 'pi_123',
        clientSecret: 'secret_123',
      });
    });

    it('should create a PayPal order and update DB', async () => {
      const dto = { amount: 50, currency: 'EUR', provider: PaymentProvider.PAYPAL };
      const internalPayment = { id: 'uuid-456', amount: 50, currency: 'EUR', status: PaymentStatus.PENDING, provider: PaymentProvider.PAYPAL };
      
      mockPrismaService.payment.create.mockResolvedValue(internalPayment);
      mockPayPalService.createOrder.mockResolvedValue({
        orderId: 'paypal_order_456',
      });
      mockPrismaService.payment.update.mockResolvedValue({
        ...internalPayment,
        externalId: 'paypal_order_456',
      });

      const result = await service.createPayment(dto);

      expect(prismaService.payment.create).toHaveBeenCalledWith({
        data: { amount: 50, currency: 'EUR', provider: PaymentProvider.PAYPAL, customerEmail: undefined },
      });
      expect(paypalService.createOrder).toHaveBeenCalledWith(50, 'EUR', 'uuid-456');
      expect(result.externalId).toBe('paypal_order_456');
    });
  });
});
